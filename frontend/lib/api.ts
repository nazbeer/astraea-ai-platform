export async function chatStream(message: string) {
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.NEXT_PUBLIC_API_KEY!
    },
    body: JSON.stringify({
      session_id: "demo",
      message
    })
  });

  return res.body!.getReader();
}
