const ID_MONGO = /^[a-f\d]{24}$/i;

/** Id de MongoDB válido: 24 caracteres hexadecimales. Los demás se tratan como "no existe". */
export const esIdValido = (id: string): boolean => ID_MONGO.test(id);
