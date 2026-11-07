# @dtc/worker

BullMQ worker that runs Flowcheq tenant provisioning jobs.

## What it does

- Consumes the `provision` queue.
- Reads the tenant from the control plane database and runs the provisioning pipeline
  (`@flowcheq/provisioner`).

## Run and test

```bash
npm run build -w @dtc/worker
npm run lint -w @dtc/worker
```
