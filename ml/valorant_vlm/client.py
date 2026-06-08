import base64
import mimetypes
from pathlib import Path
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential


def image_to_data_url(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    data = base64.b64encode(Path(path).read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"


class VLMClient:
    def __init__(self, model: str, api_key: str | None = None) -> None:
        self.model = model
        self.api_key = api_key

    def _image_part(self, image_path: str) -> dict[str, Any]:
        return {"type": "image_url", "image_url": {"url": image_to_data_url(image_path)}}

    def _is_dashscope_model(self) -> bool:
        return self.model.startswith("qwen/") or self.model.startswith("dashscope/")

    def _dashscope_model_name(self) -> str:
        return self.model.split("/", 1)[1] if "/" in self.model else self.model

    @retry(wait=wait_exponential(multiplier=1, min=1, max=8), stop=stop_after_attempt(3))
    def complete_with_images(
        self,
        system_prompt: str,
        user_prompt: str,
        image_paths: list[str],
        json_mode: bool = True,
    ) -> str:
        content: list[dict[str, Any]] = [{"type": "text", "text": user_prompt}]
        content.extend(self._image_part(path) for path in image_paths)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ]
        response_format = {"type": "json_object"} if json_mode else None

        if self._is_dashscope_model():
            from openai import OpenAI

            client = OpenAI(
                api_key=self.api_key,
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            )
            kwargs: dict[str, Any] = {
                "model": self._dashscope_model_name(),
                "messages": messages,
                "temperature": 0.01,
                "timeout": 60,
            }
            if response_format is not None:
                kwargs["response_format"] = response_format
            response = client.chat.completions.create(**kwargs)
        else:
            from litellm import completion

            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.01,
                "timeout": 60,
            }
            if self.api_key:
                kwargs["api_key"] = self.api_key
            if response_format is not None:
                kwargs["response_format"] = response_format
            response = completion(**kwargs)

        message = response.choices[0].message.content
        if isinstance(message, list):
            return "".join(part.get("text", "") for part in message if isinstance(part, dict))
        return str(message)
