import os
os.environ['BROWNIE_NETWORK_ID'] = 'mainnet'
os.environ['WEB3_INFURA_PROJECT_ID'] = ''
os.environ['ETHERSCAN_TOKEN'] = ''

from litestar import Litestar, Request, get
from litestar.exceptions import HTTPException
from y import get_price

@get('/yprice')
async def yprice(request: Request) -> dict[str, str]:

    print(request.query_params)
    token = request.query_params.get('token')
    block = int(request.query_params.get('block'))

    if not token or not block:
        raise HTTPException(status_code=400, detail="Missing parameters")

    try:
        price = await get_price(token, block, sync=False)
        return {"price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app = Litestar(route_handlers=[yprice])
