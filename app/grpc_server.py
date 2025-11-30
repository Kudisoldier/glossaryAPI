from concurrent import futures
import argparse

import grpc
from grpc_reflection.v1alpha import reflection
from google.protobuf import empty_pb2, wrappers_pb2
from sqlmodel import Session, select

from .db import engine, init_db
from .models import Term as TermModel

# Ensure stubs are generated (expects scripts/compile_protos.py to have run)
from .protos import terms_pb2, terms_pb2_grpc


class TermsService(terms_pb2_grpc.TermsServiceServicer):
    def Health(self, request, context):
        return terms_pb2.HealthCheckResponse(status="ok")

    def ListTerms(self, request, context):
        with Session(engine) as session:
            items = session.exec(select(TermModel).order_by(TermModel.keyword)).all()
            return terms_pb2.ListTermsResponse(
                terms=[
                    terms_pb2.Term(id=t.id or 0, keyword=t.keyword, description=t.description)
                    for t in items
                ]
            )

    def GetTerm(self, request, context):
        with Session(engine) as session:
            term = session.exec(select(TermModel).where(TermModel.keyword == request.keyword)).first()
            if not term:
                context.abort(grpc.StatusCode.NOT_FOUND, "Term not found")
            return terms_pb2.Term(id=term.id or 0, keyword=term.keyword, description=term.description)

    def CreateTerm(self, request, context):
        with Session(engine) as session:
            existing = session.exec(select(TermModel).where(TermModel.keyword == request.keyword)).first()
            if existing:
                context.abort(grpc.StatusCode.ALREADY_EXISTS, "Term already exists")
            term = TermModel(keyword=request.keyword, description=request.description)
            session.add(term)
            session.commit()
            session.refresh(term)
            return terms_pb2.Term(id=term.id or 0, keyword=term.keyword, description=term.description)

    def UpdateTerm(self, request, context):
        with Session(engine) as session:
            term = session.exec(select(TermModel).where(TermModel.keyword == request.keyword)).first()
            if not term:
                context.abort(grpc.StatusCode.NOT_FOUND, "Term not found")

            if request.HasField("new_keyword"):
                conflict = session.exec(
                    select(TermModel).where(TermModel.keyword == request.new_keyword.value, TermModel.id != term.id)
                ).first()
                if conflict:
                    context.abort(grpc.StatusCode.ALREADY_EXISTS, "Keyword already in use")
                term.keyword = request.new_keyword.value

            if request.HasField("description"):
                term.description = request.description.value

            session.add(term)
            session.commit()
            session.refresh(term)
            return terms_pb2.Term(id=term.id or 0, keyword=term.keyword, description=term.description)

    def DeleteTerm(self, request, context):
        with Session(engine) as session:
            term = session.exec(select(TermModel).where(TermModel.keyword == request.keyword)).first()
            if not term:
                context.abort(grpc.StatusCode.NOT_FOUND, "Term not found")
            session.delete(term)
            session.commit()
        return empty_pb2.Empty()


def serve(host: str, port: int) -> None:
    init_db()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    terms_pb2_grpc.add_TermsServiceServicer_to_server(TermsService(), server)
    # Enable server reflection for tooling like grpcurl.
    service_names = [svc.full_name for svc in terms_pb2.DESCRIPTOR.services_by_name.values()]
    service_names.append(reflection.SERVICE_NAME)
    reflection.enable_server_reflection(service_names, server)
    address = f"{host}:{port}"
    server.add_insecure_port(address)
    server.start()
    server.wait_for_termination()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=50051)
    args = parser.parse_args()
    serve(args.host, args.port)


if __name__ == "__main__":
    main()


