const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Endgame Loading")
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zvd8xno.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();
        const usersCollections = client.db("campushub").collection("users");
        const collagesCollections = client.db("campushub").collection("collages");
        const admissionCollections = client.db("campushub").collection("admission");
        const reviewCollections = client.db("campushub").collection("review");

        /********Create user*******/
        app.post("/users", async (req, res) => {
            const userDetails = req.body;
            const query = { email: userDetails.email };
            const existingUser = await usersCollections.findOne(query);
            if (existingUser) {
                return res.send({ message: "User Already Exist" });
            }
            const result = await usersCollections.insertOne(userDetails);
            res.send(result);
        })
        app.get("/singleuser/:email", async (req, res) => {
            const userEmail = req.params.email;
            const query = { email: userEmail };
            const result = await usersCollections.findOne(query);
            res.send(result);
        })

        app.patch('/updateProfile/:email', async (req, res) => {
                const email = req.params.email;
                const updateData = req.body;

                // Find the user based on the provided email
                const user = await usersCollections.findOne({ email: email });

                if (!user) {
                    return res.status(404).json({ error: 'User not found.' });
                }

                // Merge the existing user data with the new update data
                const updatedUser = { ...user, ...updateData };

                // Save the updated user profile in the database
                const updateResult = await usersCollections.updateOne({ _id: new ObjectId(user._id) }, { $set: updatedUser });
                res.send(updateResult);
        });

        app.get("/collages", async (req, res) => {
            const result = await collagesCollections.find().toArray();
            res.send(result);
        })
        app.get("/collage/:collageId", async (req, res) => {
            const query = { _id: new ObjectId(req.params.collageId) }
            const result = await collagesCollections.findOne(query);
            res.send(result);
        })


        app.post("/admitCollage", async (req, res) => {
            const candidateDetails = req.body;
            const result = await admissionCollections.insertOne(candidateDetails);
            res.send(result);
        })
        app.get("/admitCollage/:email", async (req, res) => {
            const paramsEmail = req.params.email;
            const query = { userEmail: paramsEmail };
            const result = await admissionCollections.find(query).toArray();
            res.send(result);
        })

        app.post("/review", async (req, res) => {
            const reviewData = req.body;

            const result = await reviewCollections.insertOne(reviewData);

            const findTotalReviewForACollege = await reviewCollections.aggregate([
                {
                    $match: { collegeID: reviewData.collegeID }
                },
                {
                    $group: {
                        _id: "$collegeID",
                        totalReviews: { $sum: 1 },
                        totalRating: { $sum: "$rating" }
                    }
                }
            ]).toArray();

            const totalReviews = findTotalReviewForACollege.length > 0 ? findTotalReviewForACollege[0].totalReviews : 0;
            const totalRatingSum = findTotalReviewForACollege.length > 0 ? findTotalReviewForACollege[0].totalRating : 0;

            const averageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;


            const updatedRating = await collagesCollections.updateOne(
                { _id: new ObjectId(reviewData.collegeID) },
                { $set: { rating: averageRating } }
            );

            console.log(updatedRating);

            if (updatedRating.modifiedCount > 0) {
                res.send({ result: "Success" });
            }
        })
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollections.find().toArray();
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})