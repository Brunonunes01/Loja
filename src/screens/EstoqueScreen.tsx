import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// Importa os novos tipos: EstoqueSKU (antigo Lote), Produto (antigo Peixe), Loja (antigo Tanque)
import { EstoqueSKU, Loja, Produto } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123';

// --- TYPES ---
type FormState = {
  tamanho: string;
  cor: string;
  quantidade: string;
  quantidadeInicial: string;
  fornecedor: string;
  dataEntrada: string;
  observacoes: string;
};

type EstoqueFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
  onSelectProduto: () => void;
  onSelectLoja: () => void;
  selectedProduto: Produto | null;
  selectedLoja: Loja | null;
  isEditing: boolean;
};

// --- COMPONENTES REUTILIZÁVEIS ---
const EstoqueForm = memo(({ 
  formState, 
  onFormChange, 
  onSelectProduto, 
  onSelectLoja, 
  selectedProduto, 
  selectedLoja,
  isEditing 
}: EstoqueFormProps) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* SELEÇÃO DO PRODUTO (MODELO) */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Produto / Modelo *</Text>
        <Pressable style={styles.selectButton} onPress={onSelectProduto}>
          <Text style={[styles.selectButtonText, !selectedProduto && styles.placeholderText]}>
            {selectedProduto ? `${selectedProduto.nomeModelo} (${selectedProduto.marca})` : "Selecione o modelo do tênis"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Pressable>
      </View>

      {/* DETALHES DO SKU */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tamanho *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: 42" 
            value={formState.tamanho} 
            onChangeText={v => onFormChange('tamanho', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cor *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Preto/Branco" 
            value={formState.cor} 
            onChangeText={v => onFormChange('cor', v)} 
          />
        </View>
      </View>

      {/* QUANTIDADE E FORNECEDOR */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Quantidade Atual *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="0" 
            value={formState.quantidade} 
            onChangeText={v => onFormChange('quantidade', v)} 
            keyboardType="numeric" 
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fornecedor</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Nome da Marca/Distribuidor" 
            value={formState.fornecedor} 
            onChangeText={v => onFormChange('fornecedor', v)} 
          />
        </View>
      </View>

      {/* DATA DE ENTRADA */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Data de Entrada *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="YYYY-MM-DD"
          value={formState.dataEntrada || today}
          onChangeText={v => onFormChange('dataEntrada', v)}
        />
      </View>

      {/* SELEÇÃO DA LOJA/CD */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Loja / CD *</Text>
        <Pressable style={styles.selectButton} onPress={onSelectLoja}>
          <Text style={[styles.selectButtonText, !selectedLoja && styles.placeholderText]}>
            {selectedLoja ? `${selectedLoja.nome} - ${selectedLoja.localizacao}` : "Selecione a Loja/CD de estoque"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </Pressable>
      </View>

      {/* OBSERVAÇÕES */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observações</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Anotações importantes sobre o lote de estoque..." 
          value={formState.observacoes} 
          onChangeText={v => onFormChange('observacoes', v)}
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );
});

const EstoqueCard = memo(({ item, onEdit, onDelete }: { 
  item: EstoqueSKU; 
  onEdit: (sku: EstoqueSKU) => void; 
  onDelete: (sku: EstoqueSKU) => void; 
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'disponivel': return '#10B981';
      case 'esgotado': return '#EF4444';
      case 'reservado': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const calculateDiasNoEstoque = (dataEntrada: string) => {
    const entrada = new Date(dataEntrada);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - entrada.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const diasNoEstoque = calculateDiasNoEstoque(item.dataEntrada);

  return (
    <View style={styles.loteCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.loteTitle} numberOfLines={1}>{item.nomeProduto}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status || 'disponível'}
            </Text>
          </View>
        </View>
        <Text style={styles.especieText}>
          Tamanho {item.tamanho} • Cor: {item.cor}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Ionicons name="cube-outline" size={16} color="#64748B" />
            <Text style={styles.metricText}>
                {item.quantidade?.toLocaleString('pt-BR')} pares em estoque
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="enter-outline" size={16} color="#64748B" />
            <Text style={styles.metricText}>Entrada: {item.dataEntrada}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.metricText}>{diasNoEstoque} dias no estoque</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Local: </Text>
            {item.nomeLoja}
          </Text>
          <View style={[styles.faseBadge, { backgroundColor: '#0EA5E920' }]}>
            <Text style={[styles.faseText, { color: '#0EA5E9' }]}>
              {item.fornecedor || 'Marca Própria'}
            </Text>
          </View>
        </View>

      </View>

      <View style={styles.cardActions}>
        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
});

// --- TELA PRINCIPAL ---
export default function LotesScreen() {
  const [estoque, setEstoque] = useState<EstoqueSKU[]>([]); // EstoqueSKU
  const [lojas, setLojas] = useState<Loja[]>([]); // Lojas
  const [produtos, setProdutos] = useState<Produto[]>([]); // Produtos
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // Estados para Modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [lojaModalVisible, setLojaModalVisible] = useState(false); // Modal Loja
  const [produtoModalVisible, setProdutoModalVisible] = useState(false); // Modal Produto

  // Estados para Dados
  const [currentSKU, setCurrentSKU] = useState<EstoqueSKU | null>(null); // SKU Atual
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    tamanho: '', 
    cor: '', 
    quantidade: '', 
    quantidadeInicial: '',
    fornecedor: '', 
    dataEntrada: '',
    observacoes: '',
  });
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null); // Loja Selecionada
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null); // Produto Selecionado

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    // NOVOS CAMINHOS DO FIREBASE: /estoque, /lojas, /produtos
    const estoqueRef = ref(database, `users/${user.uid}/estoque`); 
    const lojasRef = ref(database, `users/${user.uid}/lojas`); 
    const produtosRef = ref(database, `users/${user.uid}/produtos`); 

    const unsubEstoque = onValue(estoqueRef, (s) => {
      const data = s.val();
      setEstoque(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      setLoading(false);
    });
    
    const unsubLojas = onValue(lojasRef, (s) => {
      setLojas(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });
    
    const unsubProdutos = onValue(produtosRef, (s) => {
      setProdutos(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })) : []);
    });

    return () => { 
      unsubEstoque(); 
      unsubLojas(); 
      unsubProdutos(); 
    };
  }, [user]);

  // Funções de Abertura de Modais
  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    
    setCurrentSKU(null);
    setFormState({ 
      tamanho: '', 
      cor: '', 
      quantidade: '', 
      quantidadeInicial: '',
      fornecedor: '', 
      dataEntrada: today,
      observacoes: '',
    });
    setSelectedLoja(null);
    setSelectedProduto(null);
    setIsAddModalVisible(true);
  };
  
  const openEditModal = (sku: EstoqueSKU) => {
    setCurrentSKU(sku);
    setFormState({
      tamanho: sku.tamanho.toString(),
      cor: sku.cor,
      quantidade: sku.quantidade.toString(),
      quantidadeInicial: sku.quantidadeInicial?.toString() || sku.quantidade.toString(),
      fornecedor: sku.fornecedor || '',
      dataEntrada: sku.dataEntrada,
      observacoes: sku.observacoes || '',
    });
    setSelectedLoja(lojas.find(t => t.id === sku.lojaId) || null); // Loja
    setSelectedProduto(produtos.find(p => p.nomeModelo === sku.nomeProduto) || null); // Produto
    setIsEditModalVisible(true);
  };
  
  const openDeleteModal = (sku: EstoqueSKU) => {
    setCurrentSKU(sku);
    setPasswordInput('');
    setIsDeleteModalVisible(true);
  };

  const handleSelectLoja = (loja: Loja) => {
    setSelectedLoja(loja);
    setLojaModalVisible(false);
  };

  const handleSelectProduto = (produto: Produto) => {
    setSelectedProduto(produto);
    setProdutoModalVisible(false);
  };

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  // Funções CRUD
  const handleAddOrUpdateSKU = async () => {
    const { 
      tamanho, 
      cor, 
      quantidade, 
      quantidadeInicial,
      fornecedor, 
      dataEntrada,
      observacoes 
    } = formState;
    
    if (!tamanho || !cor || !quantidade || !selectedLoja || !selectedProduto || !dataEntrada) {
      return Alert.alert("Atenção", "Preencha os campos obrigatórios (*).");
    }
    
    if (!user) return;
    
    const quantidadeNum = parseInt(quantidade);
    const tamanhoNum = parseInt(tamanho);

    if (isNaN(quantidadeNum) || quantidadeNum < 0 || isNaN(tamanhoNum) || tamanhoNum <= 0) {
      return Alert.alert("Erro", "Tamanho e Quantidade devem ser números válidos.");
    }

    const skuData: EstoqueSKU = { 
      id: currentSKU?.id || '',
      produtoId: selectedProduto.id, 
      nomeProduto: selectedProduto.nomeModelo, 
      tamanho: tamanhoNum,
      cor: cor,
      quantidade: quantidadeNum,
      quantidadeInicial: quantidadeInicial ? parseInt(quantidadeInicial) : quantidadeNum,
      fornecedor: fornecedor || selectedProduto.marca,
      lojaId: selectedLoja.id, 
      nomeLoja: selectedLoja.nome,
      dataEntrada: dataEntrada,
      observacoes: observacoes || '',
      status: quantidadeNum > 0 ? 'disponivel' : 'esgotado',
      createdAt: currentSKU ? currentSKU.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (currentSKU) {
        // Usa o caminho 'estoque'
        await update(ref(database, `users/${user.uid}/estoque/${currentSKU.id}`), skuData);
        Alert.alert("Sucesso", "Estoque SKU atualizado com sucesso!");
        setIsEditModalVisible(false);
      } else {
        // Usa o caminho 'estoque'
        await set(push(ref(database, `users/${user.uid}/estoque`)), skuData);
        Alert.alert("Sucesso", "Estoque SKU criado com sucesso!");
        setIsAddModalVisible(false);
      }
    } catch (error) { 
      console.error(error);
      Alert.alert("Erro", "Ocorreu um erro ao salvar o Estoque SKU."); 
    }
  };

  const handleDeleteSKU = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("Falha na Autenticação", "A senha de administrador está incorreta.");
    }
    
    if (!user || !currentSKU) return;
    
    try {
      // Usa o caminho 'estoque'
      await remove(ref(database, `users/${user.uid}/estoque/${currentSKU.id}`));
      Alert.alert("Sucesso", "Estoque SKU excluído permanentemente.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível excluir o Estoque SKU."); 
    }
  };

  const renderItem: ListRenderItem<EstoqueSKU> = ({ item }) => (
    <EstoqueCard 
      item={item} 
      onEdit={openEditModal}
      onDelete={openDeleteModal}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={styles.loadingText}>Carregando inventário...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gestão de Estoque SKU</Text>
          <Text style={styles.subtitle}>{estoque.length} SKUs em inventário</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Novo SKU</Text>
        </Pressable>
      </View>

      {/* Lista de Estoque */}
      {estoque.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Nenhum SKU cadastrado</Text>
          <Text style={styles.emptyText}>Crie um item de estoque para começar a gerenciar</Text>
          <Pressable style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Criar Primeiro SKU</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList 
          data={estoque}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* MODAL ADICIONAR/EDITAR ESTOQUE SKU */}
      <Modal visible={isAddModalVisible || isEditModalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentSKU ? 'Editar Estoque SKU' : 'Novo Estoque SKU'}
            </Text>
            <Pressable onPress={() => { setIsAddModalVisible(false); setIsEditModalVisible(false); }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>
          
          <EstoqueForm
            formState={formState}
            onFormChange={handleFormChange}
            onSelectProduto={() => setProdutoModalVisible(true)}
            onSelectLoja={() => setLojaModalVisible(true)}
            selectedProduto={selectedProduto}
            selectedLoja={selectedLoja}
            isEditing={!!currentSKU}
          />

          <View style={styles.modalFooter}>
            <Pressable 
              style={[styles.saveButton, (!selectedProduto || !selectedLoja || !formState.tamanho || !formState.cor || !formState.quantidade) && styles.buttonDisabled]} 
              onPress={handleAddOrUpdateSKU}
              disabled={!selectedProduto || !selectedLoja || !formState.tamanho || !formState.cor || !formState.quantidade}
            >
              <Text style={styles.saveButtonText}>
                {currentSKU ? 'Atualizar Estoque' : 'Criar Estoque SKU'}
              </Text>
            </Pressable>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => { setIsAddModalVisible(false); setIsEditModalVisible(false); }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EXCLUIR ESTOQUE SKU */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.centeredModal}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.deleteTitle}>Excluir Estoque SKU</Text>
            </View>
            
            <Text style={styles.deleteText}>
              Tem certeza que deseja excluir o SKU de "{currentSKU?.nomeProduto}" (Tam: {currentSKU?.tamanho}, Cor: {currentSKU?.cor})? 
              Esta ação não pode ser desfeita.
            </Text>

            <View style={styles.passwordContainer}>
              <Text style={styles.passwordLabel}>Senha de Administrador</Text>
              <TextInput 
                style={styles.passwordInput}
                placeholder="Digite a senha"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
              />
            </View>

            <View style={styles.deleteActions}>
              <Pressable 
                style={[styles.confirmDeleteButton, !passwordInput && styles.buttonDisabled]}
                onPress={handleDeleteSKU}
                disabled={!passwordInput}
              >
                <Text style={styles.confirmDeleteText}>Confirmar Exclusão</Text>
              </Pressable>
              <Pressable 
                style={styles.cancelDeleteButton}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECIONAR LOJA/CD */}
      <Modal visible={lojaModalVisible} animationType="slide" transparent>
        <View style={styles.centeredModal}>
          <View style={styles.selectionModalContent}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Selecionar Loja / CD</Text>
              <Pressable onPress={() => setLojaModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <FlatList 
              data={lojas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.selectionItem,
                    selectedLoja?.id === item.id && styles.selectedItem
                  ]} 
                  onPress={() => handleSelectLoja(item)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={styles.selectionItemText}>{item.nome}</Text>
                    <Text style={styles.selectionItemSubtext}>{item.localizacao} ({item.capacidadeEstoque.toLocaleString('pt-BR')} pares)</Text>
                  </View>
                  {selectedLoja?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                  )}
                </Pressable>
              )} 
              ListEmptyComponent={
                <Text style={styles.emptySelectionText}>Nenhuma loja/CD cadastrado.</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL SELECIONAR PRODUTO */}
      <Modal visible={produtoModalVisible} animationType="slide" transparent>
        <View style={styles.centeredModal}>
          <View style={styles.selectionModalContent}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Selecionar Produto</Text>
              <Pressable onPress={() => setProdutoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <FlatList 
              data={produtos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.selectionItem,
                    selectedProduto?.id === item.id && styles.selectedItem
                  ]} 
                  onPress={() => handleSelectProduto(item)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={styles.selectionItemText}>{item.nomeModelo}</Text>
                    <Text style={styles.selectionItemSubtext}>{item.marca} • R$ {item.precoBase.toFixed(2)}</Text>
                  </View>
                  {selectedProduto?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#0EA5E9" />
                  )}
                </Pressable>
              )} 
              ListEmptyComponent={
                <Text style={styles.emptySelectionText}>Nenhum produto cadastrado. Crie um na tela de Produtos.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc", 
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // List
  listContent: {
    paddingBottom: 20,
  },

  // Estoque Card
  loteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  especieText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  metricText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#64748B',
  },
  faseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  faseText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#0EA5E9',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Form Styles
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#0F172A',
  },
  placeholderText: {
    color: '#9CA3AF',
  },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#0EA5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },

  // Delete Modal
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 8,
  },
  deleteText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  passwordContainer: {
    marginBottom: 20,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  deleteActions: {
    gap: 12,
  },
  confirmDeleteButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelDeleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelDeleteText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },

  // Selection Modals
  selectionModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedItem: {
    backgroundColor: '#F0F9FF',
  },
  selectionItemContent: {
    flex: 1,
  },
  selectionItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  selectionItemSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  emptySelectionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 16,
    padding: 40,
  },
});