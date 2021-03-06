import { Permission } from "./Permission";
import {v4 as uuid} from "uuid";
import { APIUser } from "./APIUser";



export class TimeStampedPermissions {
    id: string;
    exp: number;
    iat: number;
    permissions: Permission[];
    user: APIUser;

    public isExpired(): boolean {
        return ((new Date().valueOf()) > (this.exp));
    }

    public static issue (validityInSeconds: number, permissions: Permission[] | Permission, user: APIUser): TimeStampedPermissions {
        let theTimeStampedPermissions = new TimeStampedPermissions();
        theTimeStampedPermissions.id = uuid();
        theTimeStampedPermissions.iat = new Date().valueOf();
        theTimeStampedPermissions.exp = theTimeStampedPermissions.iat + validityInSeconds * 1000;
        theTimeStampedPermissions.user = user;
        if (permissions instanceof Array) {
            theTimeStampedPermissions.permissions = permissions;
        } else {
            let permissionsWrapper: Permission[] = [];
            permissionsWrapper.push(permissions);
            theTimeStampedPermissions.permissions = permissionsWrapper;
        }
        return theTimeStampedPermissions;
    }
}