
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI(
    title="ChemScope API",
    description="Backend for exploring chemical compounds",
    version="1.0.0"
)


@app.get("/")
def home():
    return {"message": "Welcome to ChemScope!"}


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "ChemScope"
    }


@app.get("/api/compounds/{name}")
async def get_compound(name: str):
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/"
        f"compound/name/{name}/property/"
        "MolecularFormula,MolecularWeight,"
        "IUPACName,CanonicalSMILES/JSON"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)

        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Compound not found. Try another name."
            )

        response.raise_for_status()
        data = response.json()

        properties = data["PropertyTable"]["Properties"][0]
        return properties

    except HTTPException:
        raise

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="PubChem took too long to respond."
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="PubChem returned an unsuccessful response."
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to PubChem."
        )

    except (ValueError, KeyError, IndexError):
        raise HTTPException(
            status_code=502,
            detail="PubChem returned an unexpected response."
        )