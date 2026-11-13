/**
 * Error de una cartola que no se puede importar tal como viene: formato
 * inesperado, datos imposibles o saldos que no cuadran. La API lo traduce a un
 * 422 con un mensaje que el usuario pueda entender; cualquier otro error es un
 * fallo nuestro (500).
 */
export class ErrorCartola extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErrorCartola'
  }
}
