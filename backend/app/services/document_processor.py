import io
import re
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx


class DocumentProcessorService:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Extrae texto de un archivo PDF preservando la referencia por página.
        Devuelve (texto_completo, lista_de_paginas)
        """
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_content = []
        full_text_list = []

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            extracted = page.extract_text() or ""
            # Normalizar saltos de línea y espacios múltiples
            cleaned_text = re.sub(r'[ \t]+', ' ', extracted)
            cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text).strip()

            pages_content.append({
                "page": page_num,
                "text": cleaned_text,
                "char_count": len(cleaned_text),
                "is_empty": len(cleaned_text.strip()) == 0
            })
            if cleaned_text:
                full_text_list.append(f"--- PÁGINA {page_num} ---\n{cleaned_text}")

        full_text = "\n\n".join(full_text_list)
        return full_text, pages_content

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Extrae texto de un documento DOCX.
        """
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = []
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                paragraphs.append(text)

        # Tablas
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)

        full_text = "\n\n".join(paragraphs)
        pages_content = [{
            "page": 1,
            "text": full_text,
            "char_count": len(full_text),
            "is_empty": len(full_text.strip()) == 0
        }]
        return full_text, pages_content

    @classmethod
    def process_file(cls, filename: str, content: bytes) -> Tuple[str, List[Dict[str, Any]], int]:
        ext = filename.lower().split(".")[-1]
        if ext == "pdf":
            text, pages = cls.extract_text_from_pdf(content)
            page_count = len(pages)
        elif ext in ["docx", "doc"]:
            text, pages = cls.extract_text_from_docx(content)
            page_count = len(pages)
        elif ext in ["txt"]:
            decoded = content.decode("utf-8", errors="replace")
            text = decoded.strip()
            pages = [{"page": 1, "text": text, "char_count": len(text), "is_empty": len(text) == 0}]
            page_count = 1
        else:
            raise ValueError(f"Formato no admitido: {ext}. Formatos válidos: PDF, DOCX, TXT.")

        if not text.strip():
            raise ValueError("El archivo no contiene texto legible o está vacío. Si es un escaneo, asegúrate de que contenga texto OCR.")

        return text, pages, page_count

