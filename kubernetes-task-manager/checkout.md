docker build -t task-manager-backend:v1

[+] Building 4.8s (12/12) FINISHED                                                                                                         docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                       0.0s
 => => transferring dockerfile: 390B                                                                                                                       0.0s
 => [internal] load metadata for docker.io/library/node:20-alpine                                                                                          1.5s
 => [auth] library/node:pull token for registry-1.docker.io                                                                                                0.0s
 => [internal] load .dockerignore                                                                                                                          0.0s
 => => transferring context: 2B                                                                                                                            0.0s
 => [internal] load build context                                                                                                                          0.1s
 => => transferring context: 50.82kB                                                                                                                       0.1s
 => [builder 1/4] FROM docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293                            0.0s
 => => resolve docker.io/library/node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293                                    0.0s
 => CACHED [builder 2/4] WORKDIR /app                                                                                                                      0.0s
 => [builder 3/4] COPY package*.json ./                                                                                                                    0.0s
 => [builder 4/4] RUN npm ci --omit=dev                                                                                                                    2.1s
 => [stage-1 3/4] COPY --from=builder /app/node_modules ./node_modules                                                                                     0.1s
 => [stage-1 4/4] COPY src/ ./src/                                                                                                                         0.0s
 => exporting to image                                                                                                                                     0.4s
 => => exporting layers                                                                                                                                    0.2s
 => => exporting manifest sha256:17a937fbca8e1e2b298503c62e0a5b1258779d4190976ca0a7a9ad5e0a581b8a                                                          0.0s
 => => exporting config sha256:3d7dd1a81f7edcb6e2c44694337a0c02a91e91bb785178180550fc8335d1ef9c                                                            0.0s
 => => exporting attestation manifest sha256:b1a00abd638b384d55e6f9cdcadc21ff6e60ad20de5ee55a429650280a1d287d                                              0.0s
 => => exporting manifest list sha256:394e839f42d8ed74e8857997bac9bd60410a5f854c78eefffbc145a761ace03c                                                     0.0s
 => => naming to docker.io/library/task-manager-backend:v1                                                                                                 0.0s
 => => unpacking to docker.io/library/task-manager-backend:v1  

 kubectl apply -f k8s/postgres/
configmap/postgres-config created
deployment.apps/postgres created
secret/postgres-secret created
service/postgres-svc created


kubectl apply -f k8s/backend/
deployment.apps/backend created
service/backend-svc created

kubectl get pods
NAME                        READY   STATUS    RESTARTS   AGE
backend-d8978d8b5-9wtmm     1/1     Running   0          50s
postgres-7454fdc89c-622gz   1/1     Running   0          4m31s

kubectl get services
NAME           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
backend-svc    ClusterIP   10.96.46.103    <none>        80/TCP     4m57s
kubernetes     ClusterIP   10.96.0.1       <none>        443/TCP    6m18s
postgres-svc   ClusterIP   10.96.198.227   <none>        5432/TCP   4m57s

kubectl port-forward svc/backend-svc 8080:80
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080

curl http://localhost:8080/health
{"status":"ok","database":"connected"}

curl -X POST -H "Content-Type: application/json" -d '{"title":"Skończyć zadanie z K8s"}' http://localhost:8080/tasks
{"id":1,"title":"Sko�czy� zadanie z K8s","status":"pending"}

curl http://localhost:8080/tasks
[{"id":1,"title":"Sko�czy� zadanie z K8s","status":"pending"}]



 kubectl describe pod backend-d8978d8b5-9wtmm
Name:             backend-d8978d8b5-9wtmm
Namespace:        default
Priority:         0
Service Account:  default
Node:             desktop-control-plane/172.26.0.2
Start Time:       Wed, 20 May 2026 13:29:12 +0200
Labels:           app=backend
                  pod-template-hash=d8978d8b5
Annotations:      <none>
Status:           Running
IP:               10.244.0.9
IPs:
  IP:           10.244.0.9
Controlled By:  ReplicaSet/backend-d8978d8b5
Containers:
  backend:
    Container ID:   containerd://27a2e7ef6d3d55b99196e7d58756ae79d2e29288909ba84360d9b06f9165c99a
    Image:          task-manager-backend:v1
    Image ID:       docker.io/library/task-manager-backend@sha256:cf65cf7dad1b3f6bec07ba9e80a508c04db633de35e9ca06f0aebfd3cf558ba9
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Wed, 20 May 2026 13:29:18 +0200
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  256Mi
    Requests:
      cpu:      100m
      memory:   128Mi
    Liveness:   http-get http://:8080/health delay=5s timeout=1s period=10s #success=1 #failure=3
    Readiness:  http-get http://:8080/health delay=3s timeout=1s period=5s #success=1 #failure=3
    Environment:
      DB_HOST:      postgres-svc
      DB_PORT:      5432
      DB_USER:      <set to the key 'POSTGRES_USER' of config map 'postgres-config'>  Optional: false
      DB_NAME:      <set to the key 'POSTGRES_DB' of config map 'postgres-config'>    Optional: false
      DB_PASSWORD:  <set to the key 'POSTGRES_PASSWORD' in secret 'postgres-secret'>  Optional: false
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-khzhg (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  kube-api-access-khzhg:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  3m8s  default-scheduler  Successfully assigned default/backend-d8978d8b5-9wtmm to desktop-control-plane
  Normal  Pulling    3m7s  kubelet            Pulling image "task-manager-backend:v1"
  Normal  Pulled     3m2s  kubelet            Successfully pulled image "task-manager-backend:v1" in 142ms (4.72s including waiting). Image size: 49120687 bytes.
  Normal  Created    3m2s  kubelet            Created container: backend
  Normal  Started    3m2s  kubelet            Started container backend