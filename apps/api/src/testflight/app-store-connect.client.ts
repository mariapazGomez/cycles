import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

const API = "https://api.appstoreconnect.apple.com/v1";

// Apple rechazó o no respondió. El mensaje nunca lleva el correo del tester:
// queda en la base y en el log.
export class TestFlightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestFlightError";
  }
}

// Agrega testers al grupo externo «Piloto» con la App Store Connect API (CYC-194).
// La llave (rol limitado a TestFlight) vive solo en variables de entorno del
// servidor: APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID,
// APP_STORE_CONNECT_PRIVATE_KEY (el .p8 en texto) y TESTFLIGHT_GROUP_ID. Sin las
// cuatro la integración está apagada y las invitaciones quedan pendientes.
@Injectable()
export class AppStoreConnectClient {
  private readonly jwt = new JwtService({});

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.keyId && this.issuerId && this.privateKey && this.groupId);
  }

  private get keyId() {
    return this.config.get<string>("APP_STORE_CONNECT_KEY_ID")?.trim();
  }
  private get issuerId() {
    return this.config.get<string>("APP_STORE_CONNECT_ISSUER_ID")?.trim();
  }
  private get groupId() {
    return this.config.get<string>("TESTFLIGHT_GROUP_ID")?.trim();
  }
  // El .p8 se pega en una variable de entorno: los saltos de línea pueden llegar como «\n».
  private get privateKey() {
    return this.config.get<string>("APP_STORE_CONNECT_PRIVATE_KEY")?.trim().replace(/\\n/g, "\n");
  }

  private token(): string {
    return this.jwt.sign(
      {},
      {
        algorithm: "ES256",
        keyid: this.keyId,
        issuer: this.issuerId,
        audience: "appstoreconnect-v1",
        privateKey: this.privateKey,
        expiresIn: "10m",
      },
    );
  }

  private async call(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token()}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new TestFlightError("No se pudo conectar con App Store Connect.");
    }
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* cuerpo que no es JSON */
    }
    return { status: response.status, json };
  }

  private errorCode(json: unknown): string {
    const first = (json as { errors?: { code?: string }[] } | null)?.errors?.[0];
    return first?.code ?? "sin código";
  }

  // Crea el tester y lo suma al grupo. Si ya existe (409) lo busca y solo lo suma
  // al grupo; si ya estaba en el grupo, también cuenta como hecho.
  async addTester(email: string, name: string): Promise<void> {
    const groupId = this.groupId as string;
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const created = await this.call("POST", "/betaTesters", {
      data: {
        type: "betaTesters",
        attributes: { email, firstName: firstName || undefined, lastName: rest.join(" ") || undefined },
        relationships: { betaGroups: { data: [{ type: "betaGroups", id: groupId }] } },
      },
    });
    if (created.status === 201) return;
    if (created.status !== 409) {
      throw new TestFlightError(`App Store Connect respondió ${created.status} (${this.errorCode(created.json)}).`);
    }

    const found = await this.call("GET", `/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`);
    const testerId = (found.json as { data?: { id?: string }[] } | null)?.data?.[0]?.id;
    if (found.status !== 200 || !testerId) {
      throw new TestFlightError(`No se encontró al tester existente (${found.status}).`);
    }
    const linked = await this.call("POST", `/betaGroups/${groupId}/relationships/betaTesters`, {
      data: [{ type: "betaTesters", id: testerId }],
    });
    if (linked.status !== 204 && linked.status !== 409) {
      throw new TestFlightError(`App Store Connect respondió ${linked.status} (${this.errorCode(linked.json)}).`);
    }
  }
}
