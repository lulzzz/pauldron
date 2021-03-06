import {Permission} from "../model/Permission";
import {TimeStampedPermissions} from "../model/TimeStampedPermissions";
import {APIError} from "../model/APIError";
import {Router, Request, Response, NextFunction} from "express";
import { request } from "http";
import { ValidationError, APIAuthorizationError } from "../model/Exceptions";
import { APIAuthorization } from "../model/APIAuthorization";
import { GenericErrorHandler } from "./GenericErrorHandler";
import { APIUser } from "../model/APIUser";
import _ = require("lodash");

export declare type RegisteredPermissions = {
  [ticketId: string]: TimeStampedPermissions
};

export class PermissionEndpoint {
  router: Router;

  constructor() {
    this.router = Router();
    this.init();
  }

  public getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const user: APIUser = APIAuthorization.validate(req, ["PERMS:L"], req.app.locals.serverConfig);
      const registered_permissions: RegisteredPermissions = req.app.locals.registeredPermissions;

      const thisUsersPermissions = Object.keys(registered_permissions).filter( (key) => (
        _.isEqual(registered_permissions[key].user, user)
      )).map((key) => (
        {[key]: registered_permissions[key]}
      )).reduce((sofar, permissionObject) => (
        {
          ... sofar,
          ... permissionObject
        }
      ), {});

      res.send(thisUsersPermissions);
    } catch (e) {
      GenericErrorHandler.handle(e, res, req);
    }
  }

  public createANewOne(req: Request, res: Response, next: NextFunction): void {
    try {
      const serverConfig = req.app.locals.serverConfig;
      const user: APIUser = APIAuthorization.validate(req, ["PERMS:C"], serverConfig);
      let registered_permissions: RegisteredPermissions = req.app.locals.registeredPermissions;

      PermissionEndpoint.validatePermissionCreationParams(req.body);
      const ticket: TimeStampedPermissions = TimeStampedPermissions.issue(serverConfig.uma.permission.ticket.ttl, req.body, user);
      registered_permissions[ticket.id] = ticket;
      res.status(201).send({ticket: ticket.id});
    } catch (e) {
      GenericErrorHandler.handle(e, res, req);
    }
  }

  private static validatePermissionCreationParams(object: any): void {
    if (object instanceof Array && Permission.validateArray(object)) {
      return;
    } else if (Permission.validate(object)) {
      return;
    }
    throw new ValidationError ("Bad Request. Expecting a Permissin or Permission array.");
  }

  private init(): void {
    this.router.get("/", this.getAll);
    this.router.post("/", this.createANewOne);
  }
}