from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Term, Source
from ..schemas import SourceCreate, SourceRead

router = APIRouter()


@router.get("/term/{keyword}", response_model=List[SourceRead])
def list_sources(keyword: str, session: Session = Depends(get_session)) -> List[Source]:
	term = session.exec(select(Term).where(Term.keyword == keyword)).first()
	if not term:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")
	return term.sources


@router.post("/term/{keyword}", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(keyword: str, data: SourceCreate, session: Session = Depends(get_session)) -> Source:
	term = session.exec(select(Term).where(Term.keyword == keyword)).first()
	if not term:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")
	
	source = Source(
		term_id=term.id,
		title=data.title,
		url=data.url,
		author=data.author,
		year=data.year
	)
	session.add(source)
	session.commit()
	session.refresh(source)
	return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(source_id: int, session: Session = Depends(get_session)) -> None:
	source = session.exec(select(Source).where(Source.id == source_id)).first()
	if not source:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
	session.delete(source)
	session.commit()
	return None
