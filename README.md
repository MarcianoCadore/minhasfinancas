# Minhas Finanças

Controle pessoal mês a mês: recebimentos (5º dia útil e dia 20), contas por tipo, quanto sobra, relatórios e uma sugestão de quanto investir.

Cada conta e cada recebimento pertencem a um mês. O seletor no topo troca o mês exibido. No cadastro dá para escolher o mês de pagamento, lançar um empréstimo parcelado ("parcela 5 de 24" vira uma conta por mês) e os valores já comprometidos do cartão nos meses seguintes. "Copiar para …" leva ao mês seguinte as contas que se repetem (sem parcelas e sem duplicar o que já existe), todas a pagar, e os recebimentos.

Os dados ficam num banco SQLite no servidor, então o computador e o celular veem as mesmas informações. Cada pessoa entra com usuário e senha ("Cadastre-se" na tela de entrada) e vê só os próprios dados. As contas cadastradas antes de existir login ficaram com a primeira conta criada.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. O banco local é criado em `dados/minhasfinancas.db` (fora do git).

## Estrutura

- `app/api/*`: rotas que leem e gravam no banco (`lib/servidor/banco.ts`).
- `lib/cliente.ts`: estado da tela; mostra cada alteração na hora e confirma no servidor.
- `lib/calculos.ts`: totais, relatórios e a sugestão de investimento.
- `components/`: as seções da página.

## Publicar na VM da Magalu Cloud

Pré-requisitos: VM Ubuntu 24.04 com IPv4 público, chave SSH cadastrada e as portas 22 e 80 liberadas no security group.

Uma vez, para preparar a VM (Node, nginx, swap, pasta do banco e serviço):

```bash
ssh ubuntu@IP_DA_VM 'bash -s' < deploy/setup-vm.sh
```

A cada nova versão:

```bash
./deploy/deploy.sh ubuntu@IP_DA_VM
```

O app fica em `http://IP_DA_VM`. O banco fica em `/var/lib/minhasfinancas/minhasfinancas.db` e não é tocado pelo deploy.
