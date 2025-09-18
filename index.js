const {MongoClient,ObjectId}=require("mongodb")
const url = process.env.MONGO_URI;


const client=new MongoClient(url)
const express=require("express")
const app=express()
const jwt=require("jsonwebtoken")
const cors=require("cors")
app.use(cors())
app.use(express.json())
let db
async function Connection(){
    await client.connect()
    console.log("Successfully Connected")
    db=client.db("users")
}
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


Connection()
const Authentication=(req,res,next)=>{
    const token=req.headers["authorization"]
    if (token){
        const jwtToken=token.split(" ")[1]
        if (jwtToken){
            jwt.verify(jwtToken,"MYTOKEN",(err,payLoad)=>{
                if (err){
                    return res.send(err)
                }
                else{
                    req.id=payLoad.id,
                    req.email=payLoad.email
                    next()
                }
            })
        }
        else{
            return res.send("Token Not Valid")
        }
    }
    else{
        return res.send("Token Not VALID")
    }
}
app.post("/register",async(req,res)=>{
    const {fullName,email,password,address}=req.body
    try{
        const query=await db.collection("usersregistration").insertOne(req.body)
        return res.send("Successfully Register")
    }
    catch(e){
        console.error(e.message)
        return res.send(e.message)
    }
})
app.post("/login",async(req,res)=>{
    const {email,password}=req.body
    try{
        const query=await db.collection("usersregistration").find({email:email}).toArray()
        console.log(query)
        if (query.length>0){
            if (query[0].password===password){
                const payLoad={id:new ObjectId(query[0]._id),email:query[0].email}
                const jwtToken=jwt.sign(payLoad,"MYTOKEN",{expiresIn:"24h"})
                return res.send({msg:"Successfully Login",jwtToken})

            }
            else{
                return res.send("Password Not Valid")
            }
            
        }
        else{
            return res.send("Email Not Found")
        }
    }
    catch(e){
        console.error(e.message)
    }
})
app.get("/users",Authentication,async(req,res)=>{
    const {id}=req
    console.log(id)
    try{
        const query=await db.collection("usersregistration").find({_id:new ObjectId(id)}).toArray()
        return res.send(query)
    }
    catch(e){
        console.error(e.message)
    }
})
app.post("/book/orders",Authentication,async(req,res)=>{
    const {email}=req
    const {items}=req.body
    const itemsArray=items.map(items=>({
        customerEmail:email,
        itemId:items.id,
        itemName:items.name,
        itemQuantity:items.quantity

    }))

    try{
        const query=await db.collection("orders").insertMany(itemsArray)
        return res.send("Successfully Ordered")
    }
    catch(e){
        console.error(e.message)
    }

})
app.get("/user/orders",Authentication,async(req,res)=>{
   const {email}=req
    console.log(email)
    try{
        const query=await db.collection("usersregistration").aggregate([
            {$match:{email:email}},{
            $lookup:{
                from:"orders",
                localField:"email",
                foreignField:"customerEmail",
                as:"customerorders"
            }
        }]).toArray()
        return res.send(query)
    }
    catch(e){
        return res.send(e.message)
    }

})
