import { initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import express from "express";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import pm2 from "pm2";
import util from "node:util";

await util.promisify(pm2.connect.bind(pm2))();

const startOptionsSchema = z.object({
  autorestart: z.boolean().optional(),
  name: z.string().optional(),
  script: z.string().optional(),
  args: z.union([z.string(), z.array(z.string())]).optional(),
  interpreter_args: z.union([z.string(), z.array(z.string())]).optional(),
  cwd: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  log_date_format: z.string().optional(),
  pid: z.string().optional(),
  min_uptime: z.number().optional(),
  max_restarts: z.number().optional(),
  max_memory_restart: z.union([z.number(), z.string()]).optional(),
  node_args: z.union([z.string(), z.array(z.string())]).optional(),
  time: z.boolean().optional(),
  wait_ready: z.boolean().optional(),
  kill_timeout: z.number().optional(),
  restart_delay: z.number().optional(),
  interpreter: z.string().optional(),
  exec_mode: z.string().optional(),
  instances: z.number().optional(),
  merge_logs: z.boolean().optional(),
  watch: z.union([z.boolean(), z.array(z.string())]).optional(),
  force: z.boolean().optional(),
  ignore_watch: z.array(z.string()).optional(),
  cron: z.any().optional(),
  execute_command: z.any().optional(),
  write: z.any().optional(),
  source_map_support: z.any().optional(),
  disable_source_map_support: z.any().optional(),
  env: z.record(z.string()).optional(),
});
const platformSchema = z.union([
  z.literal("ubuntu"),
  z.literal("centos"),
  z.literal("redhat"),
  z.literal("gentoo"),
  z.literal("systemd"),
  z.literal("darwin"),
  z.literal("amazon"),
]);
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);
const objectSchema = z.record(jsonSchema);

const createContext = () => ({});
const t = initTRPC.context().create();
const { router, procedure } = t;
const appRouter = router({
  start: procedure.input(startOptionsSchema).mutation(async ({ input }) => {
    return await new Promise<void>((cb, ecb) => {
      pm2.start(input, (err) => (err ? ecb(err) : cb()));
    });
  }),
  stop: procedure
    .input(z.union([z.number(), z.string()]))
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.stop.bind(pm2))(input);
    }),
  restart: procedure
    .input(z.union([z.number(), z.string()]))
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.restart.bind(pm2))(input);
    }),
  delete: procedure
    .input(z.union([z.number(), z.string()]))
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.delete.bind(pm2))(input);
    }),
  reload: procedure
    .input(z.union([z.number(), z.string()]))
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.reload.bind(pm2))(input);
    }),
  describe: procedure
    .input(z.union([z.number(), z.string()]))
    .query(async ({ input }) => {
      return await util.promisify(pm2.describe.bind(pm2))(input);
    }),
  list: procedure.query(async () => {
    return await util.promisify(pm2.list.bind(pm2))();
  }),
  flush: procedure
    .input(z.union([z.number(), z.string()]))
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.flush.bind(pm2))(input);
    }),
  dump: procedure.mutation(async () => {
    return await util.promisify(pm2.dump.bind(pm2))();
  }),
  reloadLogs: procedure.mutation(async () => {
    return await util.promisify(pm2.reloadLogs.bind(pm2))();
  }),
  sendSignalToProcessName: procedure
    .input(
      z.object({
        signal: z.union([z.number(), z.string()]),
        process: z.union([z.number(), z.string()]),
      })
    )
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.sendSignalToProcessName.bind(pm2))(
        input.signal,
        input.process
      );
    }),
  startup: procedure.input(platformSchema).mutation(async ({ input }) => {
    return await util.promisify(pm2.startup.bind(pm2))(input);
  }),
  sendDataToProcessId: procedure
    .input(
      z.object({
        packet: objectSchema,
        process: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await util.promisify(pm2.sendDataToProcessId.bind(pm2))(
        input.process,
        input.packet
      );
    }),
  randomNumber: procedure.subscription(() => {
    return observable((emit) => {
      const timer = setInterval(() => {
        // emits a number every second
        emit.next({ randomNumber: Math.random() });
      }, 200);

      return () => {
        clearInterval(timer);
      };
    });
  }),
});
export type AppRouter = typeof appRouter;

const app = express();
app.use(
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
    } else {
      next();
    }
  },
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);
const listener = app.listen(
  parseInt(process.env.PORT || "3000", 10),
  "127.0.0.1",
  () => {
    // @ts-ignore (the express types don't let me do this right :/)
    console.log("Your app is listening on port " + listener.address().port);
  }
);
