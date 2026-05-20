kubectl get pvc
NAME           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
postgres-pvc   Bound    pvc-b55a1ec1-684c-4303-931a-6c60f9c41a5f   1Gi        RWO            standard       <unset>                 15m

kubectl port-forward svc/backend-svc 8080:8080

kubectl apply -f k8s/backend/hpa.yaml
horizontalpodautoscaler.autoscaling/backend-hpa created

kubectl get hpa backend-hpa
NAME          REFERENCE            TARGETS              MINPODS   MAXPODS   REPLICAS   AGE
backend-hpa   Deployment/backend   cpu: <unknown>/50%   1         5         1          27s


kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# Patch omijający weryfikację certyfikatów w środowisku deweloperskim:
kubectl patch -n kube-system deployment metrics-server --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
serviceaccount/metrics-server created
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrole.rbac.authorization.k8s.io/system:metrics-server created
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader created
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator created
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server created
service/metrics-server created
deployment.apps/metrics-server created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created
deployment.apps/metrics-server patched


kubectl apply -f k8s/backend/
kubectl get hpa -w
deployment.apps/backend unchanged
horizontalpodautoscaler.autoscaling/backend-hpa unchanged
service/backend-svc unchanged
NAME          REFERENCE            TARGETS              MINPODS   MAXPODS   REPLICAS   AGE
backend-hpa   Deployment/backend   cpu: <unknown>/50%   1         5         1          13m
backend-hpa   Deployment/backend   cpu: <unknown>/50%   1         5         1          13m
