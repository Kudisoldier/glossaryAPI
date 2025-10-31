import threading
import time
import os
from pathlib import Path

import grpc
from google.protobuf import empty_pb2, wrappers_pb2

from app.db import init_db
from scripts.compile_protos import compile_terms_proto
from app.grpc_server import TermsService
from app.protos import terms_pb2, terms_pb2_grpc


_SERVER = None


def setup_module(_module):
	# ensure clean sqlite db
	db_path = Path(__file__).resolve().parents[1] / "glossary.db"
	if db_path.exists():
		os.remove(db_path)

	# compile protos to ensure stubs exist
	compile_terms_proto()
	init_db()

	# start server in background
	def _run():
		server = grpc.server(threading.Thread(target=lambda: None))
		# Correct executor for server
		from concurrent import futures
		executor = futures.ThreadPoolExecutor(max_workers=10)
		server = grpc.server(executor)
		terms_pb2_grpc.add_TermsServiceServicer_to_server(TermsService(), server)
		server.add_insecure_port("127.0.0.1:50051")
		server.start()
		globals()["_SERVER"] = server
		server.wait_for_termination()

	thread = threading.Thread(target=_run, daemon=True)
	thread.start()
	# wait a bit for server to be ready
	time.sleep(0.3)


def teardown_module(_module):
	if _SERVER is not None:
		_SERVER.stop(0)


def _stub():
	channel = grpc.insecure_channel("127.0.0.1:50051")
	return terms_pb2_grpc.TermsServiceStub(channel)


def test_health():
	resp = _stub().Health(terms_pb2.HealthCheckRequest())
	assert resp.status == "ok"


def test_list_empty():
	resp = _stub().ListTerms(terms_pb2.ListTermsRequest())
	assert resp.terms == []


def test_create_term():
	resp = _stub().CreateTerm(
		terms_pb2.CreateTermRequest(keyword="API", description="Application Programming Interface")
	)
	assert resp.keyword == "API"


def test_get_term():
	resp = _stub().GetTerm(terms_pb2.GetTermRequest(keyword="API"))
	assert resp.description.startswith("Application Programming")


def test_conflict_create():
	try:
		_stub().CreateTerm(terms_pb2.CreateTermRequest(keyword="API", description="Duplicate"))
	except grpc.RpcError as e:
		assert e.code() == grpc.StatusCode.ALREADY_EXISTS


def test_update_term_keyword_and_description():
	resp = _stub().UpdateTerm(
		terms_pb2.UpdateTermRequest(
			keyword="API",
			new_keyword=wrappers_pb2.StringValue(value="APIv2"),
			description=wrappers_pb2.StringValue(value="Updated"),
		)
	)
	assert resp.keyword == "APIv2"
	assert resp.description == "Updated"


def test_get_updated_term():
	resp = _stub().GetTerm(terms_pb2.GetTermRequest(keyword="APIv2"))
	assert resp.keyword == "APIv2"


def test_delete_term():
	_stub().DeleteTerm(terms_pb2.DeleteTermRequest(keyword="APIv2"))
	# success if no exception


def test_get_deleted_term():
	try:
		_stub().GetTerm(terms_pb2.GetTermRequest(keyword="APIv2"))
	except grpc.RpcError as e:
		assert e.code() == grpc.StatusCode.NOT_FOUND
