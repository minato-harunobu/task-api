import http from "http";

/** タスクの型定義 */
interface Task {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
}

/** インメモリのタスクストア */
const tasks: Task[] = [];
/** 次に採番するタスクID */
let nextId: number = 1;

/**
 * レスポンスをJSONで返す
 * @param res - HTTPレスポンスオブジェクト
 * @param status - HTTPステータスコード
 * @param data - レスポンスボディ
 */
function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * リクエストボディをJSONとして解析する
 * @param req - HTTPリクエストオブジェクト
 * @returns パースされたJSONオブジェクト
 */
function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * POSTボディが有効なタスク作成リクエストか検証する型ガード
 * @param body - 検証するオブジェクト
 * @returns body が `{ title: string }` の形式であれば true
 */
function isCreateTaskBody(body: unknown): body is { title: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof (body as Record<string, unknown>).title === "string" &&
    (body as Record<string, unknown>).title !== ""
  );
}

/**
 * タスク一覧を取得する (GET /tasks)
 * @param res - HTTPレスポンスオブジェクト
 */
function handleGetTasks(res: http.ServerResponse): void {
  sendJson(res, 200, tasks);
}

/**
 * 新しいタスクを追加する (POST /tasks)
 * @param req - HTTPリクエストオブジェクト
 * @param res - HTTPレスポンスオブジェクト
 */
async function handlePostTask(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const body = await parseBody(req);

  if (!isCreateTaskBody(body)) {
    sendJson(res, 400, { error: "title は必須の文字列です" });
    return;
  }

  const newTask: Task = {
    id: nextId++,
    title: body.title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  sendJson(res, 201, newTask);
}

/**
 * HTTPリクエストをルーティングするメインハンドラ
 * @param req - HTTPリクエストオブジェクト
 * @param res - HTTPレスポンスオブジェクト
 */
async function requestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const { method, url } = req;

  if (url === "/tasks" && method === "GET") {
    handleGetTasks(res);
  } else if (url === "/tasks" && method === "POST") {
    await handlePostTask(req, res);
  } else {
    sendJson(res, 404, { error: "Not Found" });
  }
}

/** サーバーがリッスンするポート番号 */
const PORT: number = 3000;
const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((err: Error) => {
    sendJson(res, 500, { error: err.message });
  });
});

server.listen(PORT, () => {
  console.log(`Task API server running at http://localhost:${PORT}`);
});
