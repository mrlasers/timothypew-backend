export class MrError extends Error {
  type: string

  private constructor(type: string, msg: any) {
    super(msg)
    this.type = type
  }

  static of(type: string) {
    return (msg: any) => new MrError(type, msg)
  }
}
