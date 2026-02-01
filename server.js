console.log("Starting backend...");

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB error:", err));

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
