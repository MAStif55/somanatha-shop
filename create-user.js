db.getSiblingDB("levprav_data").createUser({
  user: "levprav_app",
  pwd: "LevPravSecure123!",
  roles: [{ role: "dbOwner", db: "levprav_data" }]
});
