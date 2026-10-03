import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { LIMITS } from "../common/throttle/throttle";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";

// Público: lo usa el formulario de la landing, sin sesión.
@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Throttle(LIMITS.contact)
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateContactDto) {
    return this.contact.create(dto);
  }
}
