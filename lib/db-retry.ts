const TRANSIENT_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "P1001", "P1002", "P1008", "P1017"]);

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const transient =
        TRANSIENT_CODES.has(err?.code) ||
        /ETIMEDOUT|ECONNRESET|Connection terminated/i.test(err?.message ?? "");
      if (!transient || i >= attempts) throw err;
      console.log(`DB connection problem (${err?.code ?? "unknown"}). Retry ${i}/${attempts - 1}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}