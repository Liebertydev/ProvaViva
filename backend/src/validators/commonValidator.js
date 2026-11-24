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

const validarUuid = (id) => {
  // Professor usa UUID; a validação numérica acima continua exclusiva dos IDs inteiros.
  if (typeof id !== 'string' || id.length !== 36 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return "Campo 'id' inválido.";
  }

  return null;
};

export default { validarId, validarUuid };
