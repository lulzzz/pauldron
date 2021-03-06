import {TimeStampedPermissions} from "../model/TimeStampedPermissions";
import {APIError} from "../model/APIError";
import {IssuedRPTs} from "./AuthorizationEndpoint";

import {Router, Request, Response, NextFunction} from "express";
import {request} from "http";
import { InvalidRPTError, ExpiredRPTError, ValidationError, APIAuthorizationError } from "../model/Exceptions";
import { inspect } from "util";
import { APIAuthorization } from "../model/APIAuthorization";
import { GenericErrorHandler } from "./GenericErrorHandler";
import { APIUser } from "../model/APIUser";

import _ = require("lodash");


export class IntrospectionEndpoint {
  router: Router;

  constructor() {
    this.router = Router();
    this.init();
  }

  public introspect(req: Request, res: Response, next: NextFunction): void {
    try {
        const user: APIUser = APIAuthorization.validate(req, ["INTR:R"], req.app.locals.serverConfig);
        const issued_rpts: IssuedRPTs = req.app.locals.issuedRPTs;

        IntrospectionEndpoint.validateIntrospectionRequestParams(req.body);
        const token: string = req.body.token;
        const permissions: TimeStampedPermissions = issued_rpts [token];
        IntrospectionEndpoint.validatePermissions(permissions, user);

        let introspectionResponseObject = {
          ...permissions,
          active: true
        };
        delete introspectionResponseObject.id;
        res.status(200).send(introspectionResponseObject);
    } catch (e) {
      if (e instanceof InvalidRPTError || e instanceof ExpiredRPTError) {
        console.log(`RPT introspection: ${e.message}`);
        res.status(200).send({active: false});
      } else {
        GenericErrorHandler.handle(e, res, req);
      }
    }
  }

  private static validateIntrospectionRequestParams(object: any): void {
    if (!object || !object.token) {
      throw new ValidationError("Bad Request. Expecting a token.");
    }
  }

  private static validatePermissions(permissions: TimeStampedPermissions, user: APIUser): void {
    if (!permissions) {
      throw new InvalidRPTError("Invalid RPT.");
    } else if (permissions.isExpired()) {
      throw new ExpiredRPTError("RPT Expired.");
    } else if (! _.isEqual(permissions.user, user)) {
      throw new InvalidRPTError("Invalid RPT.");
    }
  }

  private init(): void {
    this.router.post("/", this.introspect);
  }
}