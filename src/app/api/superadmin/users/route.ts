import { requireSuperadmin } from "@/server/auth/guards";
import { json, parseJson, route } from "@/server/http/route";
import { createUserSchema, userListQuerySchema } from "@/server/modules/staff-users/schemas";
import { createUser, listUsers } from "@/server/modules/staff-users/service";

export const GET = route(async (req) => {
  await requireSuperadmin(req);
  return json(
    await listUsers(userListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))),
  );
});

export const POST = route(async (req) => {
  const { actor } = await requireSuperadmin(req);
  const input = await parseJson(req, createUserSchema);
  return json(await createUser(input, actor), { status: 201 });
});
