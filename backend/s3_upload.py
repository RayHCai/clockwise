"""AWS S3 presigned URL generation for session artifact uploads."""

import os

import boto3
from botocore.config import Config


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_urls(session_id: str) -> dict:
    """Generate presigned PUT URLs for audio, video, and PDF uploads."""
    client = get_s3_client()
    bucket = os.getenv("S3_BUCKET_NAME", "guidr-sessions")
    prefix = f"sessions/{session_id}"

    files = [
        ("audio_url", f"{prefix}/audio.webm", "audio/webm"),
        ("video_url", f"{prefix}/video.webm", "video/webm"),
        ("pdf_url", f"{prefix}/report.pdf", "application/pdf"),
    ]

    urls = {}
    for url_key, key, content_type in files:
        urls[url_key] = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=600,
        )

    return {**urls, "session_id": session_id}
