import { db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";

export async function seedUsers() {
  const DEFAULT_PASSWORD = "0000";

  const users = [
    { id: "ann", name: "Ann", password: DEFAULT_PASSWORD },
    { id: "sjie", name: "S姐", password: DEFAULT_PASSWORD },
    { id: "teacher", name: "老師", password: DEFAULT_PASSWORD },
    { id: "heng", name: "姮姮", password: DEFAULT_PASSWORD },
    { id: "qiaoyu", name: "喬魚", password: DEFAULT_PASSWORD },
    { id: "baobao", name: "寶寶", password: DEFAULT_PASSWORD },
    { id: "titi", name: "踢踢", password: DEFAULT_PASSWORD },
    { id: "xiaomei", name: "小玫", password: DEFAULT_PASSWORD },
    { id: "yeye", name: "葉葉", password: DEFAULT_PASSWORD }
  ];

  for (const user of users) {
    await setDoc(
      doc(
        db,
        "artifacts",
        "default-app-id",
        "public",
        "data",
        "users",
        user.id
      ),
      user
    );
  }

  console.log("使用者資料已成功建立！");
}
