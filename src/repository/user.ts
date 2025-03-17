import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { VERSION } from "../constants/index.js";
import { firestore } from "../firebase/init.js";
import type { User } from "../firebase/models/user.js";

export const fetchUserList = async (workspaceId: string) => {
  const _collectionRef = firestore
    .collection(`version/${VERSION}/workspace/${workspaceId}/user`)
    .withConverter(userConverter);
  const _queryDocSnapshot = (await _collectionRef.get()).docs;
  const _users = _queryDocSnapshot.map((_doc) => _doc.data());
  return _users;
};

export const findUser = async (workspaceId: string, slackUserId: string) => {
  const _docRef = firestore
    .collection(`version/${VERSION}/workspace/${workspaceId}/user`)
    .doc(slackUserId)
    .withConverter(userConverter);
  const _docSnapshot = await _docRef.get();
  const _user = _docSnapshot.data();
  return _user;
};

// createもこれを使う
export const updateUser = async (workspaceId: string, editedUser: User) => {
  const _docRef = firestore
    .collection(`version/${VERSION}/workspace/${workspaceId}/user`)
    .doc(editedUser.id)
    .withConverter(userConverter);
  await _docRef.set(editedUser);
};

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore: (user: User): DocumentData => {
    const newDoc: Partial<User> = { ...user };
    delete newDoc.id;
    return newDoc;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<User>): User => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      deviceList: data.deviceList,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};
