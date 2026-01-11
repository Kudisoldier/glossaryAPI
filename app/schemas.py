from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict
from .models import RelationType


class TermCreate(BaseModel):
	keyword: str = Field(min_length=1, max_length=128)
	description: str = Field(min_length=1, max_length=2048)
	category: Optional[str] = Field(default=None, max_length=64)


class TermUpdate(BaseModel):
	keyword: Optional[str] = Field(default=None, min_length=1, max_length=128)
	description: Optional[str] = Field(default=None, min_length=1, max_length=2048)
	category: Optional[str] = Field(default=None, max_length=64)


class SourceRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	title: str
	url: Optional[str] = None
	author: Optional[str] = None
	year: Optional[int] = None


class SourceCreate(BaseModel):
	title: str = Field(min_length=1, max_length=256)
	url: Optional[str] = Field(default=None, max_length=512)
	author: Optional[str] = Field(default=None, max_length=128)
	year: Optional[int] = Field(default=None)


class TermRelationRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	term_from_id: int
	term_to_id: int
	relation_type: RelationType
	description: Optional[str] = None
	term_from_keyword: Optional[str] = None
	term_to_keyword: Optional[str] = None


class TermRelationCreate(BaseModel):
	term_to_keyword: str = Field(min_length=1, max_length=128)
	relation_type: RelationType = Field(default=RelationType.RELATED)
	description: Optional[str] = Field(default=None, max_length=512)


class TermRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	keyword: str
	description: str
	category: Optional[str] = None
	sources: List[SourceRead] = []
	relations_from: List[TermRelationRead] = []
	relations_to: List[TermRelationRead] = []


class GraphNode(BaseModel):
	id: int
	label: str
	description: str
	category: Optional[str] = None


class GraphEdge(BaseModel):
	from_id: int
	to_id: int
	label: str
	type: RelationType


class GraphResponse(BaseModel):
	nodes: List[GraphNode]
	edges: List[GraphEdge]
