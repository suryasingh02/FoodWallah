import { getCurrentUser } from "@/lib/auth";
import { getCustomerOrder } from "@/lib/db";
import { orderEvents } from "@/lib/order-events";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const orderId = new URL(request.url).searchParams.get("id")?.replace(/^#/, "");
  if (!user || (user.role !== "customer" && !orderId)) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = (updatedOrderId: string) => {
        if (orderId && (updatedOrderId !== orderId || !getCustomerOrder(orderId, user.id))) return;
        controller.enqueue(encoder.encode(`event: order-updated\ndata: ${JSON.stringify({ orderId: updatedOrderId })}\n\n`));
      };

      orderEvents.on("order-updated", sendUpdate);
      controller.enqueue(encoder.encode(": connected\n\n"));
      cleanup = () => { orderEvents.off("order-updated", sendUpdate); };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: { "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Content-Type": "text/event-stream" } });
}