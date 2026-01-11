from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Term, TermRelation
from ..schemas import TermRelationCreate, TermRelationRead

router = APIRouter()


@router.get("/term/{keyword}", response_model=List[TermRelationRead])
def list_relations(keyword: str, session: Session = Depends(get_session)) -> List[TermRelationRead]:
	term = session.exec(select(Term).where(Term.keyword == keyword)).first()
	if not term:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")
	
	# Load relations from
	relations_from = session.exec(
		select(TermRelation).where(TermRelation.term_from_id == term.id)
	).all()
	
	# Load relations to
	relations_to = session.exec(
		select(TermRelation).where(TermRelation.term_to_id == term.id)
	).all()
	
	relations = []
	for rel in relations_from:
		term_to = session.exec(select(Term).where(Term.id == rel.term_to_id)).first()
		rel_dict = rel.model_dump()
		rel_dict["term_from_keyword"] = term.keyword
		rel_dict["term_to_keyword"] = term_to.keyword if term_to else ""
		relations.append(TermRelationRead(**rel_dict))
	
	for rel in relations_to:
		term_from = session.exec(select(Term).where(Term.id == rel.term_from_id)).first()
		rel_dict = rel.model_dump()
		rel_dict["term_from_keyword"] = term_from.keyword if term_from else ""
		rel_dict["term_to_keyword"] = term.keyword
		relations.append(TermRelationRead(**rel_dict))
	
	return relations


@router.post("/term/{keyword}", response_model=TermRelationRead, status_code=status.HTTP_201_CREATED)
def create_relation(keyword: str, data: TermRelationCreate, session: Session = Depends(get_session)) -> TermRelation:
	term_from = session.exec(select(Term).where(Term.keyword == keyword)).first()
	if not term_from:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")
	
	term_to = session.exec(select(Term).where(Term.keyword == data.term_to_keyword)).first()
	if not term_to:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target term not found")
	
	if term_from.id == term_to.id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot relate term to itself")
	
	# Check if relation already exists
	existing = session.exec(
		select(TermRelation).where(
			TermRelation.term_from_id == term_from.id,
			TermRelation.term_to_id == term_to.id,
			TermRelation.relation_type == data.relation_type
		)
	).first()
	if existing:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Relation already exists")
	
	relation = TermRelation(
		term_from_id=term_from.id,
		term_to_id=term_to.id,
		relation_type=data.relation_type,
		description=data.description
	)
	session.add(relation)
	session.commit()
	session.refresh(relation)
	
	# Reload to get fresh data
	relation = session.exec(select(TermRelation).where(TermRelation.id == relation.id)).first()
	rel_dict = relation.model_dump()
	rel_dict["term_from_keyword"] = term_from.keyword
	rel_dict["term_to_keyword"] = term_to.keyword
	return TermRelationRead(**rel_dict)


@router.delete("/{relation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relation(relation_id: int, session: Session = Depends(get_session)) -> None:
	relation = session.exec(select(TermRelation).where(TermRelation.id == relation_id)).first()
	if not relation:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relation not found")
	session.delete(relation)
	session.commit()
	return None
