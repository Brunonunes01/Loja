import { createStackNavigator } from "@react-navigation/stack";
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Importação de todas as telas
import AlimentacaoScreen from "../../src/screens/AlimentacaoScreen";
import LoginScreen from "../../src/screens/Auth/LoginScreen";
import RegisterScreen from "../../src/screens/Auth/RegisterScreen";
import BiometriaScreen from "../../src/screens/BiometriaScreen";
import DashboardScreen from "../../src/screens/DashboardScreen";
import HomeScreen from "../../src/screens/HomeScreen";
import ListaUsuarios from "../../src/screens/ListaUsuarios";
import LotesScreen from "../../src/screens/LotesScreen";
import PedidosScreen from "../../src/screens/PedidosScreen";
import PeixesScreen from "../../src/screens/PeixesScreen";
import PerfilScreen from "../../src/screens/PerfilScreen";
import TanquesScreen from "../../src/screens/TanquesScreen";
import PlaceholderScreen from "../../src/screens/TelaPlaceholder";
import { auth } from "../../src/services/connectionFirebase";

// --- DEFINIÇÕES DE TIPO (SNEAKER STORE) ---

// 1. Onde Está o Estoque (Substitui Tanque)
export type Loja = {
  id: string; 
  nome: string; 
  localizacao: string; // Ex: CD São Paulo, Loja Centro
  capacidadeEstoque: number; // Em número de pares
  enderecoCompleto?: string; 
  createdAt?: string;
  updatedAt?: string;
  status: 'ativa' | 'manutencao' | 'inativa';
};

// 2. O Tênis/Modelo (Substitui Peixe)
export type Produto = {
  id: string; 
  nomeModelo: string; // Ex: Nike Air Max 90
  marca: string; // Ex: Nike, Adidas
  precoBase: number;
  categoria: 'esportivo' | 'casual' | 'skate' | 'corrida' | 'outro';
  genero: 'masculino' | 'feminino' | 'unissex';
  dataLancamento?: string;
  imagemURL?: string;
  observacoes?: string;
};

// 3. Inventário Detalhado por Atributo (Substitui Lote)
export type EstoqueSKU = {
  id: string; 
  produtoId: string; // FK para Produto
  nomeProduto: string; 
  tamanho: number; // Ex: 40, 42
  cor: string; // Ex: Preto/Vermelho
  lojaId: string; // FK para Loja
  nomeLoja: string;
  quantidade: number; // Estoque atual
  quantidadeInicial: number; // Estoque recebido
  dataEntrada: string; 
  fornecedor: string;
  status: 'disponivel' | 'esgotado' | 'reservado';
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
};

// 4. O Pedido do Cliente (Substitui Pedido)
export type Venda = {
  id: string;
  cliente: string; 
  produtoVendido: string; // SKU (Modelo, Tamanho e Cor)
  quantidade: number;
  valorTotal: number;
  status: 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado';
  dataEnvio: string;
  timestamp: number;
  
  clienteTelefone?: string;
  enderecoEntrega?: string;
  lojaOrigemId: string;
  observacoes?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  formaPagamento?: 'pix' | 'cartao' | 'boleto';
};

// 5. Tipo para Relatórios de Vendas (Adaptado de Biometria)
export type RelatorioVenda = {
  id: string; 
  data: string; 
  vendaId: string; 
  produtoNome: string;
  margemLucro: number; 
  custoTotal: number;
  observacoes: string;
  // Métricas
  volumeVendasDia?: number;
  estoqueAtualizado?: number;
};

// 6. Tipo para Relatórios de Estoque (Adaptado de Alimentacao)
export type RelatorioEstoque = {
  id: string;
  data: string;
  skuId: string;
  skuNome: string;
  quantidadeRecebida: number; 
  quantidadeVendida: number;
  estoqueAtual: number;
  observacoes?: string;
};

// --- TIPOS DE NAVEGAÇÃO ---
export type RootStackParamList = {
  Home: undefined; 
  Login: undefined; 
  Register: undefined; 
  Dashboard: undefined;
  Perfil: { userId?: string }; 
  
  // NOVAS ROTAS (E-COMMERCE)
  Lojas: undefined; 
  Estoque: undefined; 
  Produtos: undefined;
  Vendas: undefined;
  RelatoriosVendas: undefined; // Antiga Biometria
  RelatoriosEstoque: undefined; // Antiga Alimentacao
  
  ListaUsuarios: undefined;
  
  // ROTAS ANTIGAS (Mantidas para evitar erros de tipo temporariamente)
  Tanques: undefined;
  Lotes: undefined;
  Peixes: undefined;
  Alimentacao: undefined;
  Biometria: undefined;
  Relatorios: undefined;
  Pedidos: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// --- COMPONENTES DE NAVEGAÇÃO ---
function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#f8fafc' },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      
      {/* TELAS DE E-COMMERCE - REUTILIZAÇÃO DE COMPONENTES */}
      <Stack.Screen name="Lojas" component={TanquesScreen} /> 
      <Stack.Screen name="Estoque" component={LotesScreen} /> 
      <Stack.Screen name="Produtos" component={PeixesScreen} />
      <Stack.Screen name="Vendas" component={PedidosScreen} /> 
      <Stack.Screen name="RelatoriosVendas" component={BiometriaScreen} /> 
      <Stack.Screen name="RelatoriosEstoque" component={AlimentacaoScreen} />
      
      {/* TELAS SECUNDÁRIAS */}
      <Stack.Screen name="ListaUsuarios" component={ListaUsuarios} />
      <Stack.Screen name="Relatorios" component={PlaceholderScreen} />
      
      {/* ROTAS ANTIGAS (Redirecionam para as novas, se forem chamadas) */}
      <Stack.Screen name="Tanques" component={TanquesScreen} />
      <Stack.Screen name="Lotes" component={LotesScreen} />
      <Stack.Screen name="Peixes" component={PeixesScreen} />
      <Stack.Screen name="Alimentacao" component={AlimentacaoScreen} />
      <Stack.Screen name="Biometria" component={BiometriaScreen} />
      <Stack.Screen name="Pedidos" component={PedidosScreen} />
    </Stack.Navigator>
  );
}

export default function RootStack() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (loading) setLoading(false);
    });
    return unsubscribe;
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return user ? <AppStack /> : <AuthStack />;
}