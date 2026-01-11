from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Term, TermRelation
from ..schemas import GraphResponse, GraphNode, GraphEdge

router = APIRouter()


@router.get("/", response_model=GraphResponse)
def get_graph(session: Session = Depends(get_session)) -> GraphResponse:
	"""Get the complete semantic graph of all terms and their relations"""
	terms = session.exec(select(Term)).all()
	relations = session.exec(select(TermRelation)).all()
	
	nodes = [
		GraphNode(
			id=term.id,
			label=term.keyword,
			description=term.description,
			category=term.category
		)
		for term in terms
	]
	
	edges = [
		GraphEdge(
			from_id=rel.term_from_id,
			to_id=rel.term_to_id,
			label=rel.relation_type.value,
			type=rel.relation_type
		)
		for rel in relations
	]
	
	return GraphResponse(nodes=nodes, edges=edges)
