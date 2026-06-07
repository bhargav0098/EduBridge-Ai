import asyncio
import json
from typing import Dict, Set

class SSEManager:
    def __init__(self):
        # Maps user_id -> set of asyncio.Queue instances
        self.user_queues: Dict[str, Set[asyncio.Queue]] = {}
        # Set of all active connection queues
        self.connections: Set[asyncio.Queue] = set()

    async def subscribe(self, queue: asyncio.Queue, user_id: str = None):
        self.connections.add(queue)
        if user_id:
            if user_id not in self.user_queues:
                self.user_queues[user_id] = set()
            self.user_queues[user_id].add(queue)

    async def unsubscribe(self, queue: asyncio.Queue, user_id: str = None):
        self.connections.discard(queue)
        if user_id and user_id in self.user_queues:
            self.user_queues[user_id].discard(queue)
            if not self.user_queues[user_id]:
                del self.user_queues[user_id]

    async def broadcast(self, data: dict):
        """Send data to all active streams."""
        message = f"data: {json.dumps(data)}\n\n"
        for q in list(self.connections):
            try:
                await q.put(message)
            except Exception:
                pass

    async def send_to_user(self, user_id: str, data: dict):
        """Send data to a specific user's active streams."""
        message = f"data: {json.dumps(data)}\n\n"
        queues = self.user_queues.get(user_id, set())
        for q in list(queues):
            try:
                await q.put(message)
            except Exception:
                pass

sse_manager = SSEManager()
