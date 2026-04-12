function requiredEnv(name, rawEnv = process.env, context = "this operation") {
  const value = `${rawEnv?.[name] || ""}`.trim();

  if (!value) {
    throw new Error(`${name} is required for ${context}.`);
  }

  return value;
}

function getDefaultAdminSeedEmail(rawEnv = process.env) {
  return requiredEnv("ADMIN_SEED_EMAIL", rawEnv, "default admin account seeding").toLowerCase();
}

async function findDefaultAdminAccount(prisma, rawEnv = process.env) {
  const email = getDefaultAdminSeedEmail(rawEnv);

  return prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      is_active: true,
      password_hash: true,
      role: true,
    },
    where: {
      email,
    },
  });
}

async function assertDefaultAdminAccountSeeded(prisma, rawEnv = process.env) {
  const email = getDefaultAdminSeedEmail(rawEnv);
  const user = await findDefaultAdminAccount(prisma, rawEnv);

  if (!user) {
    throw new Error(
      `Default admin account ${email} was not found after seeding. Check ADMIN_SEED_EMAIL and rerun the seed step.`,
    );
  }

  const issues = [];

  if (!user.is_active) {
    issues.push("the account is inactive");
  }

  if (user.role !== "SUPER_ADMIN") {
    issues.push(`the role is ${user.role} instead of SUPER_ADMIN`);
  }

  if (!`${user.password_hash || ""}`.trim()) {
    issues.push("the password hash is missing");
  }

  if (issues.length) {
    throw new Error(
      `Default admin account ${email} is invalid after seeding: ${issues.join(", ")}.`,
    );
  }

  return user;
}

module.exports = {
  assertDefaultAdminAccountSeeded,
  findDefaultAdminAccount,
  getDefaultAdminSeedEmail,
};
