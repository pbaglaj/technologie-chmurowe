wdrazanie pliku deployment.yaml:
kubectl apply -f deployment.yaml

kubectl get pods

NAME                        READY   STATUS    RESTARTS   AGE
hello-app-f6bc6c655-gpcx7   1/1     Running   0          7s

kubectl get deployment hello-app

NAME        READY   UP-TO-DATE   AVAILABLE   AGE
hello-app   1/1     1            1           31s

kubectl describe deployment hello-app

Name:                   hello-app
Namespace:              default
CreationTimestamp:      Wed, 20 May 2026 11:59:36 +0200
Labels:                 app=hello-app
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=hello-app
Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=hello-app
  Containers:
   hello-app:
    Image:         gcr.io/google-samples/hello-app:1.0
    Port:          8080/TCP
    Host Port:     0/TCP
    Environment:   <none>
    Mounts:        <none>
  Volumes:         <none>
  Node-Selectors:  <none>
  Tolerations:     <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   hello-app-f6bc6c655 (1/1 replicas created)
Events:
  Type     Reason                 Age   From                   Message
  ----     ------                 ----  ----                   -------
  Warning  ReplicaSetCreateError  42s   deployment-controller  Failed to create new replica set "hello-app-f6bc6c655": Unauthorized
  Normal   ScalingReplicaSet      42s   deployment-controller  Scaled up replica set hello-app-f6bc6c655 from 0 to 1



kubectl port-forward deployment/hello-app 8080:8080

Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080


curl http://localhost:8080

Hello, world!
Version: 1.0.0
Hostname: hello-app-f6bc6c655-gpcx7


kubectl scale deployment hello-app --replicas=5

kubectl get pods
NAME                        READY   STATUS    RESTARTS   AGE
hello-app-f6bc6c655-8jhv8   1/1     Running   0          10s
hello-app-f6bc6c655-8mrqn   1/1     Running   0          10s
hello-app-f6bc6c655-gpcx7   1/1     Running   0          2m32s
hello-app-f6bc6c655-l9bs2   1/1     Running   0          10s
hello-app-f6bc6c655-x8t4b   1/1     Running   0          10s

kubectl delete pod hello-app-f6bc6c655-gpcx7
pod "hello-app-f6bc6c655-gpcx7" deleted from default namespace

kubectl get pods
NAME                        READY   STATUS    RESTARTS   AGE
hello-app-f6bc6c655-8jhv8   1/1     Running   0          89s
hello-app-f6bc6c655-8mrqn   1/1     Running   0          89s
hello-app-f6bc6c655-l9bs2   1/1     Running   0          89s
hello-app-f6bc6c655-nf9zv   1/1     Running   0          21s
hello-app-f6bc6c655-x8t4b   1/1     Running   0          89s


curl http://localhost:8080
Hello, world!
Version: 1.0.0
Hostname: hello-app-f6bc6c655-8jhv8