const validarId = (id) => {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    return "Campo 'id' inválido.";
  }

  const idNumerico = Number(id);

  // Prisma Int no PostgreSQL usa inteiro assinado de 32 bits.
  if (!Number.isSafeInteger(idNumerico) || idNumerico > 2147483647) {
    return "Campo 'id' inválido.";
  }

  return null;
};

export default { validarId };
