import type { Plugin, Connect } from "vite";
import { renderAdminMenuHtml } from "./admin-scenes";

type RequestWithUrl = {
  url?: string;
  method?: string;
};

type ResponseWithSend = {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
};

export function createAdminMiddleware(base = "/"): Connect.NextHandleFunction {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const adminPaths = new Set([
    "/admin",
    "/admin/",
    `${normalizedBase}admin`,
    `${normalizedBase}admin/`,
  ]);

  return (req, res, next) => {
    const httpReq = req as unknown as RequestWithUrl;
    const httpRes = res as unknown as ResponseWithSend;

    if (!httpReq.url) return next();
    if (
      httpReq.method &&
      httpReq.method !== "GET" &&
      httpReq.method !== "HEAD"
    ) {
      return next();
    }

    let pathname = "";
    try {
      pathname = new URL(httpReq.url, "http://localhost").pathname;
    } catch {
      return next();
    }

    if (adminPaths.has(pathname)) {
      const html = renderAdminMenuHtml(normalizedBase);
      httpRes.statusCode = 200;
      httpRes.setHeader("Content-Type", "text/html; charset=utf-8");
      httpRes.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      if (httpReq.method === "HEAD") {
        httpRes.end();
      } else {
        httpRes.end(html);
      }
      return;
    }

    next();
  };
}

export function adminDevPlugin(base = "/"): Plugin {
  const middleware = createAdminMiddleware(base);

  return {
    name: "admin-dev-scene-menu",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
