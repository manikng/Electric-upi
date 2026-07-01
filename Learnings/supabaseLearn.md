Always use the source truth from the web page using these sites:
"https://orm.drizzle.team/docs/select",
"https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase",
"https://orm.drizzle.team/docs/insert",
"https://orm.drizzle.team/docs/select",
"https://orm.drizzle.team/docs/migrations",
"https://orm.drizzle.team/docs/guides/limit-offset-pagination"
"https://orm.drizzle.team/docs/indexes-constraints"
.

For ex if the file structure are like this :
Basic file structure
This is the basic file structure of the project. In the src/db directory, we have database-related files including connection in index.ts and schema definitions in schema.ts.

📦 <project root>
 ├ 📂 src
 │   ├ 📂 db
 │   │  ├ 📜 index.ts
 │   │  └ 📜 schema.ts
 ├ 📂 supabase
 │   ├ 📂 migrations
 │   │  ├ 📂 meta
 │   │  │  ├ 📜 _journal.json
 │   │  │  └ 📜 0000_snapshot.json
 │   │  └ 📜 0000_watery_spencer_smythe.sql
 │   └ 📜 config.toml
 ├ 📜 .env
 ├ 📜 drizzle.config.ts
 ├ 📜 package.json
 └ 📜 tsconfig.json

Query examples
For instance, we create src/db/queries folder and separate files for each operation: insert, select, update, delete.

Insert data
Read more about insert query in the documentation.

src/db/queries/insert.ts

import { db } from '../index';
import { InsertPost, InsertUser, postsTable, usersTable } from '../schema';
export async function createUser(data: InsertUser) {
  await db.insert(usersTable).values(data);
}
export async function createPost(data: InsertPost) {
  await db.insert(postsTable).values(data);
}
Select data
Read more about select query in the documentation.

IMPORTANT
getColumns available starting from drizzle-orm@1.0.0-beta.2(read more here)

If you are on pre-1 version(like 0.45.1) then use getTableColumns

src/db/queries/select.ts

import { asc, between, count, eq, getColumns, sql } from 'drizzle-orm';
import { db } from '../index';
import { SelectUser, postsTable, usersTable } from '../schema';
export async function getUserById(id: SelectUser['id']): Promise<
  Array<{
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.id, id));
}
export async function getUsersWithPostsCount(
  page = 1,
  pageSize = 5,
): Promise<
  Array<{
    postsCount: number;
    id: number;
    name: string;
    age: number;
    email: string;
  }>
> {
  return db
    .select({
      ...getColumns(usersTable),
      postsCount: count(postsTable.id),
    })
    .from(usersTable)
    .leftJoin(postsTable, eq(usersTable.id, postsTable.userId))
    .groupBy(usersTable.id)
    .orderBy(asc(usersTable.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
export async function getPostsForLast24Hours(
  page = 1,
  pageSize = 5,
): Promise<
  Array<{
    id: number;
    title: string;
  }>
> {
  return db
    .select({
      id: postsTable.id,
      title: postsTable.title,
    })
    .from(postsTable)
    .where(between(postsTable.createdAt, sql`now() - interval '1 day'`, sql`now()`))
    .orderBy(asc(postsTable.title), asc(postsTable.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
Alternatively, you can use relational query syntax.

Update data
Read more about update query in the documentation.

src/db/queries/update.ts

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { SelectPost, postsTable } from '../schema';
export async function updatePost(id: SelectPost['id'], data: Partial<Omit<SelectPost, 'id'>>) {
  await db.update(postsTable).set(data).where(eq(postsTable.id, id));
}
Delete data
Read more about delete query in the documentation.

src/db/queries/delete.ts

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { SelectUser, usersTable } from '../schema';
export async function deleteUser(id: SelectUser['id']) {
  await db.delete(usersTable).where(eq(usersTable.id, id));
}

Limit & offset
MSSQL
Use .limit() and .offset() to add limit and offset clauses to the query - for example, to implement pagination:

await db.select().from(users).limit(10);
await db.select().from(users).limit(10).offset(10);

select "id", "name", "age" from "users" limit 10;
select "id", "name", "age" from "users" limit 10 offset 10;

Fetch & offset
MSSQL
In MSSQL, FETCH and OFFSET are part of the ORDER BY clause, so they can only be used after the .orderBy() function

await db.select().from(users).orderBy(asc(users.id)).offset(5);
await db.select().from(users).orderBy(asc(users.id)).offset(5).fetch(10);

select [id], [name], [age] from [users] offset 5 rows;
select [id], [name], [age] from [users] offset 5 rows fetch next 10 rows;

Benefits of cursor-based pagination: consistent query results, with no skipped or duplicated rows due to insert or delete operations, and greater efficiency compared to limit/offset pagination because it does not need to scan and skip previous rows to access the next page.

Drawbacks of cursor-based pagination: the inability to directly navigate to a specific page and complexity of implementation. Since you add more columns to the sort order, you’ll need to add more filters to the where clause for the cursor comparison to ensure consistent pagination.

So, if you need to directly navigate to a specific page or you need simpler implementation of pagination, you should consider using offset/limit pagination instead.