// UUID v4 simple para ids de idempotencia generados en cliente (ver
// LogSetDto.id): no necesita ser criptográficamente seguro, solo único.
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
