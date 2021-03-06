import {Router, Request, Response, NextFunction} from "express";
import { ValidationError, APIAuthorizationError, ObjectNotFoundError } from "../model/Exceptions";
import { Policy, SimplePolicyEngine, PolicyEngine, SimplePolicy } from "pauldron-policy";
import * as hash from "object-hash";
import { APIError } from "../model/APIError";
import { APIAuthorization } from "../model/APIAuthorization";
import { GenericErrorHandler } from "./GenericErrorHandler";
import { APIUser } from "../model/APIUser";

export const policyTypeToEnginesMap: {[id: string]: PolicyEngine} = {
    "pauldron:simple-policy": new SimplePolicyEngine()
};

export const policyTypeToValidator: {[id: string]: ((Policy) => boolean)} = {
    "pauldron:simple-policy": SimplePolicy.validatePolicy
};

export declare type ActivePolicies = {
    [id: string]: Policy
  };


export class PolicyEndpoint {
    router: Router;

    constructor() {
      this.router = Router();
      this.init();
    }

    public createANewOne(req: Request, res: Response, next: NextFunction): void {
        try {
            const user: APIUser = APIAuthorization.validate(req, ["POL:C"], req.app.locals.serverConfig);

            let policies: ActivePolicies = req.app.locals.policies;
            PolicyEndpoint.validateNewPolicyRequestParams(req.body);
            const policy = req.body as Policy;
            const id = hash(policy);
            if (! policies[id]) {
                policies[id] = policy;
                res.status(201).send(
                    {
                        "id": id,
                        ... policies[id]
                    }
                );

            } else {
                res.status(200).send(
                    {
                        "id": id,
                        ... policies[id]
                    }
                );
            }
        } catch (e) {
            GenericErrorHandler.handle(e, res, req);
        }
    }

    public getAll(req: Request, res: Response, next: NextFunction): void {
        try {
            const user: APIUser = APIAuthorization.validate(req, ["POL:L"], req.app.locals.serverConfig);

            const policies = req.app.locals.policies;
            res.status(200).send(Object.keys(policies)
                .map((id) => (
                    {
                        "id": id,
                        ... policies[id]
                    }
                ))
            );
        } catch (e) {
            GenericErrorHandler.handle(e, res, req);
        }
    }

    public getOne(req: Request, res: Response, next: NextFunction): void {
        try {
            const user: APIUser = APIAuthorization.validate(req, ["POL:R"], req.app.locals.serverConfig);
            const policies = req.app.locals.policies;
            const id = req.params.id;
            const policy = policies [id];
            if (policy) {
                res.status(200).send({
                    "id": id,
                    ... policy
                });
            } else {
                throw new ObjectNotFoundError (`No policy exists by the id '${id}'.`);
            }
        } catch (e) {
            GenericErrorHandler.handle(e, res, req);
        }
    }

    public deleteOne(req: Request, res: Response, next: NextFunction): void {
        try {
            const user: APIUser = APIAuthorization.validate(req, ["POL:D"], req.app.locals.serverConfig);
            const policies = req.app.locals.policies;
            const id = req.params.id;
            const policy = policies [id];
            if (policy) {
                delete policies[id];
                res.status(204).send();
            } else {
                throw new ObjectNotFoundError (`No policy exists by the id '${id}'.`);
            }
        } catch (e) {
            GenericErrorHandler.handle(e, res, req);
        }
    }

    private static validateNewPolicyRequestParams(policy: any): void {
        if (!policy) {
            throw new ValidationError ("Bad Request. Must provide a Policy.");
        } else if (! policy.type || ! ((policy.type as string).length > 0 )) {
            throw new ValidationError ("Bad Request. Expecting a valid 'type'.");
        } else if (! Object.keys(policyTypeToEnginesMap).includes(policy.type)) {
            throw new ValidationError
            (`The server does not support policy type ${policy.type}. Current supported formats: ${Object.keys(policyTypeToEnginesMap).join(",")}`);
        } else if (! Object.keys(policyTypeToValidator).includes(policy.type)) {
            throw new ValidationError
            (`Could not find the validator for policy type ${policy.type}.`);
        }
        try {
            const validationResult = policyTypeToValidator[policy.type].call(null, policy);
        } catch (e) {
            throw new ValidationError(`Invalid policy: ${e.message}`);
        }
        // todo more validation based on the type. Each type must have its own validator to be called.
    }
    private init(): void {
        this.router.post("/", this.createANewOne);
        this.router.get("/", this.getAll);
        this.router.get("/:id", this.getOne);
        this.router.delete("/:id", this.deleteOne);
    }
}