"""
流处理工具函数
包含处理 LLM 流式响应的工具函数
"""

import logging
import json
from fastrtc import AdditionalOutputs
from typing import Any, Generator, Tuple, Union
import time

from .async_utils import run_async

def process_llm_stream(
    client, 
    messages, 
    model, 
    siliconflow_config, 
    voice_output_language=None, 
    is_same_language=True, 
    run_predict_emotion=None, 
    ai_stream=None, 
    text_to_speech_stream=None,
    max_tokens=None,
    max_context_length=None,
):
    """
    处理 LLM 的流式响应，支持 Claude 模型的特殊处理逻辑
    
    参数:
        client: OpenAI 客户端
        messages: 消息历史
        model: 使用的模型名称
        siliconflow_config: 语音合成配置
        voice_output_language: 语音输出语言
        is_same_language: 文本和语音是否为同一语言
        run_predict_emotion: 情感分析函数
        ai_stream: AI 流式生成函数
        text_to_speech_stream: 文本转语音流函数
        max_tokens: 最大生成令牌数
        max_context_length: 上下文最大消息数
        
    返回:
        生成器，产生音频块和额外输出
    """
    full_response = ""
    current_buffer = ""
    is_foreign = True
    chinese_response = ""
    
    if "claude" not in model.lower():
        # 非 Claude 模型的处理逻辑
        for text_chunk, current_full_response in ai_stream(client, messages, model=model, max_tokens=max_tokens, max_context_length=max_context_length):
            # 发送流式LLM响应片段到前端
            stream_json = json.dumps({"type": "llm_stream", "data": text_chunk})
            logging.info(f"stream_json: {stream_json}")
            yield AdditionalOutputs(stream_json)
            full_response = current_full_response
        
        # 将文本包装成JSON对象，表示这是LLM返回的完整响应
        llm_response_json = json.dumps({"type": "llm_response", "data": f"{full_response}"})
        yield AdditionalOutputs(llm_response_json)
        
        # 使用封装的文本转语音函数，并传入目标语言
        for audio_chunk in text_to_speech_stream(full_response, 
                                              voice=siliconflow_config.get("voice"), 
                                              target_language=voice_output_language):
            yield audio_chunk
        
        # 等待情感分析结果
        if run_predict_emotion:
            emotion_response = run_async(run_predict_emotion, full_response, client)
            # 将情感分析结果发送到前端
            emotion_json = json.dumps({"type": "emotion_response", "data": f"{emotion_response}"})
            yield AdditionalOutputs(emotion_json)
    else:
        # Claude 模型的处理逻辑
        for text_chunk, current_full_response in ai_stream(client, messages, model=model, max_tokens=max_tokens, max_context_length=max_context_length):    
            # 更新完整响应和当前缓冲区
            full_response = current_full_response
            current_buffer += text_chunk
            
            if is_same_language:
                # 同语言处理逻辑
                is_foreign = False
                if "</seg>" in current_buffer:
                    parts = current_buffer.split("</seg>")
                    for i in range(len(parts) - 1):
                        part = parts[i].strip()
                        if part:
                            chinese_response += part
                            # 情感分析并发送到前端
                            if run_predict_emotion:
                                emotion_result = run_async(run_predict_emotion, part, client)
                                emotion_json = json.dumps({"type": "emotion_response", "data": f"{emotion_result}"})
                                yield AdditionalOutputs(emotion_json)
                            
                            # 发送文本到前端
                            text_json = json.dumps({"type": "llm_stream", "data": part})
                            yield AdditionalOutputs(text_json)
                            
                            # 文本转语音
                            for audio_chunk in text_to_speech_stream(part, voice=siliconflow_config.get("voice")):
                                yield audio_chunk
                    
                    current_buffer = parts[-1]
            else:
                # 不同语言处理逻辑
                if "</seg>" in current_buffer:
                    parts = current_buffer.split("</seg>")
                    for i in range(len(parts) - 1):
                        part = parts[i].strip()
                        if part:
                            if not is_foreign:
                                chinese_response += part
                                text_json = json.dumps({"type": "llm_stream", "data": part})
                                yield AdditionalOutputs(text_json)
                            if is_foreign:
                                # 对外语部分进行情感分析和语音合成
                                if run_predict_emotion:
                                    emotion_result = run_async(run_predict_emotion, part, client)
                                    emotion_json = json.dumps({"type": "emotion_response", "data": f"{emotion_result}"})
                                    yield AdditionalOutputs(emotion_json)
                                
                                # 文本转语音
                                for audio_chunk in text_to_speech_stream(part, voice=siliconflow_config.get("voice")):
                                    yield audio_chunk                            
                            is_foreign = not is_foreign
                    
                    current_buffer = parts[-1]
        
        # 处理最后可能剩余的内容
        if current_buffer.strip() and not is_foreign:
            chinese_response += current_buffer.strip()
        
        # 发送完整响应
        if "claude" not in model.lower():
            llm_response_json = json.dumps({"type": "llm_response", "data": f"{full_response}"})
            yield AdditionalOutputs(llm_response_json)
        else:
            llm_response_json = json.dumps({"type": "llm_response", "data": f"{chinese_response}"})
            yield AdditionalOutputs(llm_response_json)
    
    # 在yield完所有内容后，再yield一次full_response字符串
    # 这样调用者就可以获取完整的响应文本
    yield full_response if "claude" not in model.lower() else chinese_response 