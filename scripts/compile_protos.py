import os
from pathlib import Path

from grpc_tools import protoc
from pkg_resources import resource_filename


def compile_terms_proto() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    proto_dir = repo_root / "app" / "protos"
    proto_file = proto_dir / "terms.proto"
    google_api_dir = proto_dir / "google" / "api"
    out_dir = proto_dir

    os.makedirs(out_dir, exist_ok=True)

    grpc_tools_include = resource_filename('grpc_tools', '_proto')
    args = [
        "protoc",
        f"-I{proto_dir}",
        f"-I{grpc_tools_include}",
        f"--python_out={out_dir}",
        f"--grpc_python_out={out_dir}",
        str(proto_file),
        str(google_api_dir / "annotations.proto"),
        str(google_api_dir / "http.proto"),
    ]

    if protoc.main(args) != 0:
        raise RuntimeError("Error: proto compilation failed")

    # Fix imports in generated *_pb2_grpc.py to be package-relative
    pb2_grpc_path = out_dir / "terms_pb2_grpc.py"
    if pb2_grpc_path.exists():
        text = pb2_grpc_path.read_text()
        if "import terms_pb2 as" in text and "from . import terms_pb2 as" not in text:
            text = text.replace("import terms_pb2 as", "from . import terms_pb2 as")
            pb2_grpc_path.write_text(text)

    # Fix imports for google.api annotations to use local package
    pb2_path = out_dir / "terms_pb2.py"
    if pb2_path.exists():
        text = pb2_path.read_text()
        if "from google.api import annotations_pb2 as" in text and "from .google.api import annotations_pb2 as" not in text:
            text = text.replace("from google.api import annotations_pb2 as", "from .google.api import annotations_pb2 as")
            pb2_path.write_text(text)

    # Fix imports inside generated google/api files to be package-relative
    ann_path = out_dir / "google" / "api" / "annotations_pb2.py"
    if ann_path.exists():
        text = ann_path.read_text()
        if "from google.api import http_pb2 as" in text and "from . import http_pb2 as" not in text:
            text = text.replace("from google.api import http_pb2 as", "from . import http_pb2 as")
            ann_path.write_text(text)


if __name__ == "__main__":
    compile_terms_proto()


