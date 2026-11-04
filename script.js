// URL da API do Google Apps Script
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbze5aTshdf41GOGpHzEp4WqUIP4VoReDLvr3CPRz4EionFb1lRMn5m5R7nHBH-OQ8I2rQ/exec";

const form = document.getElementById("attendanceForm");
const submitButton = document.getElementById("submitButton");
const message = document.getElementById("message");
const locationStatus = document.getElementById("locationStatus");

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}

function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.textContent = loading
    ? "Enviando registro..."
    : "Registrar presença";
}

function getLocation() {
    return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error(
        "Seu navegador não oferece suporte à geolocalização."
        ));
        return;
    }

    locationStatus.textContent = "Obtendo sua localização...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
        locationStatus.textContent =
            "Localização obtida com sucesso.";

        resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        });
        },

        (error) => {
        let errorMessage;

        switch (error.code) {
            case error.PERMISSION_DENIED:
            errorMessage =
                "Permissão de localização negada. Autorize o GPS no navegador.";
            break;

            case error.POSITION_UNAVAILABLE:
            errorMessage =
                "Não foi possível determinar sua localização.";
            break;

            case error.TIMEOUT:
            errorMessage =
                "Tempo limite para obter localização excedido.";
            break;

            default:
            errorMessage =
                "Ocorreu um erro ao obter sua localização.";
        }

        reject(new Error(errorMessage));
        },

        {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
        }
    );
    });
}

function sendData(data) {
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("O servidor não respondeu. Tente novamente."));
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
    }

    window[cbName] = (result) => {
      cleanup();
      if (result && result.sucesso) resolve(result);
      else reject(new Error((result && result.mensagem) || "O servidor não registrou a presença."));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Falha de comunicação com o servidor."));
    };

    const params = new URLSearchParams({
      acao: "registrar",
      callback: cbName,
      nome: data.nome,
      cpf: data.cpf,
      atividade: data.atividade,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy
    });

    script.src = SCRIPT_URL + "?" + params.toString();
    document.body.appendChild(script);
  });
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.className = "message";
    message.textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const cpf = document.getElementById("cpf").value.trim();
    const atividade = document.getElementById("atividade").value;

    if (!nome || !cpf || !atividade) {
    showMessage(
        "Preencha todos os campos antes de continuar.",
        "error"
    );
    return;
    }

    setLoading(true);

    try {
    // Primeiro, obtém a localização do participante.
    const location = await getLocation();

    // Monta os dados enviados para o Apps Script.
    const payload = {
        nome: nome,
        cpf: cpf,
        atividade: atividade,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
    };

    locationStatus.textContent = "Enviando registro...";

    // Envia os dados para a API.
    const resultado = await sendData(payload);

    if (resultado.status && resultado.status.startsWith("VÁLIDO")) {
        showMessage("Presença registrada com sucesso!", "success");
    } else {
        showMessage(
            "Presença registrada, porém você está fora do local do evento. " +
            "A organização fará a conferência.",
            "info"
        );
    }

    locationStatus.textContent = "Envio concluído.";
    form.reset();

    } catch (error) {
    console.error("Erro no registro:", error);

    showMessage(
        error.message ||
        "Não foi possível enviar a solicitação. Tente novamente.",
        "error"
    );

    locationStatus.textContent =
        "Não foi possível concluir o envio.";

    } finally {
    setLoading(false);
    }
});
