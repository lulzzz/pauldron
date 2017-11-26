import {Permission} from "../model/Permission";
import {TimeStampedPermissions} from "../model/TimeStampedPermissions";
import {APIError} from "../model/APIError";
import {registered_permissions} from "./PermissionEndpoint";


import {Router, Request, Response, NextFunction} from "express";
import {request} from "http";

export let issued_rpts: { [rpt: string]: TimeStampedPermissions } = {};

export class AuthorizationEndpoint {
  router: Router;

  constructor() {
    this.router = Router();
    this.init();
  }

  public createANewOne(req: Request, res: Response, next: NextFunction): void {
    try {
        AuthorizationEndpoint.validateRPTRequestParams(req.body);
        const ticket: string = req.body.ticket;
        const permissions: TimeStampedPermissions = registered_permissions [ticket];
        if (permissions && !permissions.isExpired()) {
            const rpt: TimeStampedPermissions = TimeStampedPermissions.issue(20, permissions.permissions);
            issued_rpts[rpt.id] = rpt;
            res.status(201)
            .send({rpt: rpt.id});
            delete registered_permissions[ticket];
        } else {
            res.status(400)
            .send(
              new APIError("Ticket not recognized.",
              "invalid_ticket",
              400
            )
          );
        }
    } catch (e) {
      res.status(400)
        .send(
          new APIError(e.message,
          "MissingParameter",
          400
        )
      );
    }
  }

  private static validateRPTRequestParams(object: any): void {
    if (object && object.ticket) {
      return;
    }
    throw new Error ("Bad Request. Expecting a ticket.");
  }

  private init(): void {
    this.router.post("/", this.createANewOne);
  }
}

export default new AuthorizationEndpoint();