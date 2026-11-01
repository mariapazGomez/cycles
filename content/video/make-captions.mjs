// Genera src/captions.ts: el texto corregido a mano, repartido en trozos de
// pocas palabras y con el tiempo de cada segmento de la transcripción.
import fs from "node:fs";
const seg = JSON.parse(fs.readFileSync("transcripcion-whisper.json", "utf8"));
const texts = [
  "Muchas veces, el primer producto, la primera iteración de lo que estoy haciendo, no te va a llevar al producto final,",
  "pero lo importante es empezar y eso es lo que hicimos nosotros.",
  "Como empecé haciendo la primera aplicación, que me llevó a lo que realmente quería hacer después,",
  "con un modelo de inteligencia artificial le pasaba el Excel al modelo,",
  "me lo convertía al formato que yo había hecho, que era esta visualización mucho más linda y más consumible por el usuario.",
  "Pero después tenía que hacer eso cada vez que él me lo mandaba y no tenía ningún sentido.",
  "Solo pensé en el atleta, como yo, como usuario.",
  "Como cualquier aplicación de entrenamiento, mostrar el ejercicio, mostrar la planificación, que tuviera pausas",
  "y ver las cargas que estaba haciendo en la zona del cuerpo, etcétera, y no mucho más.",
  "Lo que hice fue como comentarlo con amigos, pero la aplicación de rutina ya está ultra repetida,",
  "entonces le agrego un poco de mi cosecha y creo que es mucho más interesante hacer un sistema",
  "más que solo una aplicación.",
  "Y eso se los dejo para el próximo capítulo.",
];
const out = [];
seg.forEach((s, i) => {
  const words = texts[i].split(/\s+/);
  const n = Math.ceil(words.length / 4); // trozos de ~4 palabras
  const per = Math.ceil(words.length / n);
  const chunks = [];
  for (let k = 0; k < words.length; k += per) chunks.push(words.slice(k, k + per));
  const total = words.join(" ").length;
  let t = s.start;
  chunks.forEach((c) => {
    const len = c.join(" ").length;
    const d = ((s.end - s.start) * len) / total;
    out.push({ text: c.join(" "), start: +t.toFixed(2), end: +(t + d).toFixed(2) });
    t += d;
  });
});
fs.writeFileSync("src/captions.ts", `// Generado por make-captions.mjs\nexport const CAPTIONS = ${JSON.stringify(out, null, 2)};\n`);
console.log(out.length, "trozos");
