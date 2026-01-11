from typing import Optional, List
from enum import Enum

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey


class RelationType(str, Enum):
	RELATED = "related"
	SYNONYM = "synonym"
	ANTONYM = "antonym"
	PARENT = "parent"
	CHILD = "child"
	SEE_ALSO = "see_also"


class Term(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	keyword: str = Field(index=True, unique=True, min_length=1, max_length=128)
	description: str = Field(min_length=1, max_length=2048)
	category: Optional[str] = Field(default=None, max_length=64)
	
	# Relationships
	sources: List["Source"] = Relationship(back_populates="term")
	relations_from: List["TermRelation"] = Relationship(
		back_populates="term_from",
		sa_relationship_kwargs={
			"foreign_keys": "[TermRelation.term_from_id]",
			"cascade": "all, delete-orphan"
		}
	)
	relations_to: List["TermRelation"] = Relationship(
		back_populates="term_to",
		sa_relationship_kwargs={
			"foreign_keys": "[TermRelation.term_to_id]",
			"cascade": "all, delete-orphan"
		}
	)


class Source(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	term_id: int = Field(foreign_key="term.id")
	title: str = Field(min_length=1, max_length=256)
	url: Optional[str] = Field(default=None, max_length=512)
	author: Optional[str] = Field(default=None, max_length=128)
	year: Optional[int] = Field(default=None)
	
	term: Term = Relationship(back_populates="sources")


class TermRelation(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	term_from_id: int = Field(foreign_key="term.id")
	term_to_id: int = Field(foreign_key="term.id")
	relation_type: RelationType = Field(default=RelationType.RELATED)
	description: Optional[str] = Field(default=None, max_length=512)
	
	term_from: Term = Relationship(
		back_populates="relations_from",
		sa_relationship_kwargs={"foreign_keys": "[TermRelation.term_from_id]"}
	)
	term_to: Term = Relationship(
		back_populates="relations_to",
		sa_relationship_kwargs={"foreign_keys": "[TermRelation.term_to_id]"}
	)
