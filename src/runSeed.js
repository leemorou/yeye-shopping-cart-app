import { seedUsers } from "./seedUsers";

seedUsers().then(() => {
  console.log("Seed 完成！");
});
