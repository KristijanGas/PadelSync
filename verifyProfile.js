const{ requiresAuth } = require('express-openid-connect')
const axios = require('axios')


async function verifyProfile(req){
        let data = {}

        const {token_type, access_token} = req.oidc.accessToken;

        try{
                const apiResponse = await axios.get('http://localhost:5000/private',
                        {
                                headers:{
                                        authorization: `${token_type} ${access_token}`
                                }
                        }
                )
                data = apiResponse.data
        }catch(e){
                console.log(e);
        }
        return data.emailVerified;
}


module.exports = verifyProfile;