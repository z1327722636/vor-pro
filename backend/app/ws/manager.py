from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, job_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[job_id].add(websocket)

    def disconnect(self, job_id: int, websocket: WebSocket) -> None:
        sockets = self._rooms.get(job_id)
        if sockets is None:
            return
        sockets.discard(websocket)
        if not sockets:
            self._rooms.pop(job_id, None)

    async def broadcast_job(self, job_id: int, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for socket in self._rooms.get(job_id, set()):
            try:
                await socket.send_json(payload)
            except RuntimeError:
                dead.append(socket)
        for socket in dead:
            self.disconnect(job_id, socket)


ws_manager = WebSocketManager()
